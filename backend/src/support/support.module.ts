import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { InboundEmailController } from './inbound-email.controller';
import { SupportController } from './support.controller';
import { SupportMessage } from './support-message.entity';
import { SupportTicket } from './support-ticket.entity';
import { SupportService } from './support.service';

@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([SupportTicket, SupportMessage, User])],
    controllers: [SupportController, InboundEmailController],
    providers: [SupportService],
    exports: [SupportService],
})
export class SupportModule { }
