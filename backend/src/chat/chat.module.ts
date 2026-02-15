import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Message } from './message.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Message])],
    providers: [ChatGateway, ChatService],
    controllers: [ChatController],
})
export class ChatModule { }
