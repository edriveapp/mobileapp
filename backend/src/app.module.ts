import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { Message } from './chat/message.entity';
import { CommonModule } from './common/common.module';
import { PaymentsModule } from './payments/payments.module';
import { Rating } from './ratings/rating.entity';
import { RatingsModule } from './ratings/ratings.module';
import { Booking } from './rides/booking.entity';
import { Ride } from './rides/ride.entity';
import { RidesModule } from './rides/rides.module';
import { SupportMessage } from './support/support-message.entity';
import { SupportTicket } from './support/support-ticket.entity';
import { SupportModule } from './support/support.module';
import { DriverProfile } from './users/driver-profile.entity';
import { SavedPlace } from './users/saved-place.entity';
import { User } from './users/user.entity';
import { WalletTransaction } from './users/wallet-transaction.entity';
import { UsersModule } from './users/users.module';
import { DriverWarning } from './admin/driver-warning.entity';
import { NotificationCampaign } from './admin/notification-campaign.entity';
import databaseConfig from './common/configs/database.config';
import redisConfig from './common/configs/redis.config';
import { MediaModule } from './common/media/media.module';


@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, redisConfig],
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                ...configService.get('database'),
                entities: [User, DriverProfile, Ride, Booking, Message, Rating, SavedPlace, SupportTicket, SupportMessage, DriverWarning, NotificationCampaign, WalletTransaction],
            }),
            inject: [ConfigService],
        }),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'public'),
            serveRoot: '/public',
        }),
        UsersModule,
        AuthModule,
        RidesModule,
        CommonModule,
        ChatModule,
        PaymentsModule,
        RatingsModule,
        SupportModule,
        AdminModule,
        MediaModule,
    ],
    controllers: [AppController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }
