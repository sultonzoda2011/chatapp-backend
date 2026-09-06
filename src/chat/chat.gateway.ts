import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { extractToken } from '../common/guards/ws-jwt.guard';
import { ChatService } from './chat.service';

function conversationRoom(id: number) {
  return `conversation:${id}`;
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwt: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = extractToken(client);
      if (!token) throw new Error('No token');

      const payload = this.jwt.verify<JwtPayload>(token);
      client.data.user = payload;

      client.join(`user:${payload.sub}`);
      const conversationIds = await this.chatService.getUserConversationIds(payload.sub);
      conversationIds.forEach((id) => client.join(conversationRoom(id)));

      await this.chatService.setOnlineStatus(payload.sub, true);
      this.server.emit('user:online', { userId: payload.sub });

      this.logger.log(`Client connected: user ${payload.sub}`);
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user: JwtPayload | undefined = client.data.user;
    if (!user) return;

    await this.chatService.setOnlineStatus(user.sub, false);
    this.server.emit('user:offline', { userId: user.sub, lastSeenAt: new Date() });
    this.logger.log(`Client disconnected: user ${user.sub}`);
  }

  @SubscribeMessage('conversation:join')
  async onJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const user: JwtPayload = client.data.user;
    await this.chatService.assertMember(data.conversationId, user.sub);
    client.join(conversationRoom(data.conversationId));
    return { event: 'conversation:joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('message:send')
  async onSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; content: string },
  ) {
    const user: JwtPayload = client.data.user;
    const message = await this.chatService.sendMessage(data.conversationId, user.sub, data.content);
    this.server.to(conversationRoom(data.conversationId)).emit('message:new', message);
    return { event: 'message:sent', data: message };
  }

  @SubscribeMessage('message:edit')
  async onEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number; content: string },
  ) {
    const user: JwtPayload = client.data.user;
    const message = await this.chatService.editMessage(data.messageId, user.sub, data.content);
    this.server.to(conversationRoom(message.conversationId)).emit('message:updated', message);
    return { event: 'message:edited', data: message };
  }

  @SubscribeMessage('message:delete')
  async onDeleteMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { messageId: number }) {
    const user: JwtPayload = client.data.user;
    const result = await this.chatService.deleteMessage(data.messageId, user.sub);
    this.server.to(conversationRoom(result.conversationId)).emit('message:deleted', result);
    return { event: 'message:deleted', data: result };
  }

  broadcastNewMessage(conversationId: number, message: unknown) {
    this.server.to(conversationRoom(conversationId)).emit('message:new', message);
  }

  broadcastMessageUpdated(message: { conversationId: number }) {
    this.server.to(conversationRoom(message.conversationId)).emit('message:updated', message);
  }

  broadcastMessageDeleted(result: { id: number; conversationId: number }) {
    this.server.to(conversationRoom(result.conversationId)).emit('message:deleted', result);
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; isTyping: boolean },
  ) {
    const user: JwtPayload = client.data.user;
    client
      .to(conversationRoom(data.conversationId))
      .emit('typing', { conversationId: data.conversationId, userId: user.sub, isTyping: data.isTyping });
  }
}
