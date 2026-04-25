import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Ride } from '../rides/ride.entity';
import { Rating } from '../ratings/rating.entity';
import { SupportMessage } from '../support/support-message.entity';
import { SupportTicket } from '../support/support-ticket.entity';
import { CommonModule } from '../common/common.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DriverWarning } from './driver-warning.entity';
import { NotificationCampaign } from './notification-campaign.entity';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { WalletTransaction } from '../users/wallet-transaction.entity';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([User, Ride, Rating, DriverWarning, NotificationCampaign, SupportTicket, SupportMessage, WalletTransaction]),
        CommonModule,
        PaymentsModule,
    ],
    controllers: [AdminController],
    providers: [AdminService, NotificationSchedulerService],
    exports: [AdminService],
})
export class AdminModule {}
