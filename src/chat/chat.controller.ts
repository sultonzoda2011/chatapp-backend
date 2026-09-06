import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AddMemberDto, CreateGroupDto, GetMessagesQuery, SendMessageDto, UpdateMessageDto } from './dto/chat.dto';
import { ok } from '../common/response.util';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  async listConversations(@CurrentUser() user: JwtPayload) {
    const data = await this.chatService.listConversations(user.sub);
    return ok('Conversations retrieved successfully', data);
  }

  @Post('conversations/direct/:userId')
  async openDirect(@CurrentUser() user: JwtPayload, @Param('userId', ParseIntPipe) userId: number) {
    const data = await this.chatService.getOrCreateDirectConversation(user.sub, userId);
    return ok('Direct conversation ready', data);
  }

  @Post('conversations/group')
  async createGroup(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    const data = await this.chatService.createGroup(user.sub, dto.name, dto.memberIds);
    return ok('Group created successfully', data);
  }

  @Post('conversations/:id/members')
  async addMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() dto: AddMemberDto,
  ) {
    const data = await this.chatService.addMember(conversationId, user.sub, dto.userId);
    return ok('Member added successfully', data);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) conversationId: number,
    @Query() query: GetMessagesQuery,
  ) {
    const data = await this.chatService.getMessages(
      conversationId,
      user.sub,
      query.cursor ? Number(query.cursor) : undefined,
      query.limit ? Number(query.limit) : undefined,
    );
    return ok('Messages retrieved successfully', data);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.chatService.sendMessage(conversationId, user.sub, dto.content);
    this.chatGateway.broadcastNewMessage(conversationId, data);
    return ok('Message sent successfully', data);
  }

  @Patch('messages/:id')
  async updateMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) messageId: number,
    @Body() dto: UpdateMessageDto,
  ) {
    const data = await this.chatService.editMessage(messageId, user.sub, dto.content);
    this.chatGateway.broadcastMessageUpdated(data);
    return ok('Message updated successfully', data);
  }

  @Delete('messages/:id')
  async deleteMessage(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) messageId: number) {
    const result = await this.chatService.deleteMessage(messageId, user.sub);
    this.chatGateway.broadcastMessageDeleted(result);
    return ok('Message deleted successfully');
  }
}
