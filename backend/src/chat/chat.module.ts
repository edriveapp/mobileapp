import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesModule } from '../rides/rides.module';
import { UsersModule } from '../users/users.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Message } from './message.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Message]),
        RidesModule,
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
    providers: [ChatGateway, ChatService],
    controllers: [ChatController],
})
export class ChatModule { }
