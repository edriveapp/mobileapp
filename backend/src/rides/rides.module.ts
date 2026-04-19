import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Ride } from './ride.entity';
import { Booking } from './booking.entity';
import { RidesController } from './rides.controller';
import { RidesGateway } from './rides.gateway';
import { RidesService } from './rides.service';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Ride, User, Booking]),
        CommonModule,
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const secret = configService.get<string>('JWT_SECRET');
                if (!secret) throw new Error('JWT_SECRET environment variable is not set');
                return { secret };
            },
            inject: [ConfigService],
        }),
    ],
    providers: [RidesService, RidesGateway],
    controllers: [RidesController],
    exports: [RidesService, RidesGateway],
})
export class RidesModule { }
