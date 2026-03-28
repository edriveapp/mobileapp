import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { SupportController } from './support.controller';
import { SupportMessage } from './support-message.entity';
import { SupportTicket } from './support-ticket.entity';
import { SupportService } from './support.service';

@Module({
    imports: [TypeOrmModule.forFeature([SupportTicket, SupportMessage, User])],
    controllers: [SupportController],
    providers: [SupportService],
    exports: [SupportService],
})
export class SupportModule { }
