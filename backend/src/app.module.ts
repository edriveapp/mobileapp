import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { Message } from './chat/message.entity';
import { CommonModule } from './common/common.module';
import { PaymentsModule } from './payments/payments.module';
import { Rating } from './ratings/rating.entity';
import { RatingsModule } from './ratings/ratings.module';
import { Ride } from './rides/ride.entity';
import { RidesModule } from './rides/rides.module';
import { DriverProfile } from './users/driver-profile.entity';
import { SavedPlace } from './users/saved-place.entity';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST') || 'localhost',
                port: parseInt(configService.get<string>('DB_PORT') || '5432'),
                username: configService.get<string>('DB_USER') || 'edrive',
                password: configService.get<string>('DB_PASS') || 'edrive_password',
                database: configService.get<string>('DB_NAME') || 'edrive_db',
                entities: [User, DriverProfile, Ride, Message, Rating, SavedPlace],
                synchronize: true, // Auto-create tables (dev only)
            }),
            inject: [ConfigService],
        }),
        UsersModule,
        AuthModule,
        RidesModule,
        CommonModule,
        ChatModule,
        PaymentsModule,
        RatingsModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }
