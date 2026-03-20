import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesModule } from '../rides/rides.module';
import { UsersModule } from '../users/users.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Message } from './message.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Message]), RidesModule, UsersModule],
    providers: [ChatGateway, ChatService],
    controllers: [ChatController],
})
export class ChatModule { }
