import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
