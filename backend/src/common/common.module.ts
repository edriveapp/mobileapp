import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerService } from './mailer.service';
import { OSRMService } from './osrm.service';
import { PushNotificationsService } from './push-notifications.service';
import { RedisService } from './redis.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [RedisService, OSRMService, PushNotificationsService, MailerService],
    exports: [RedisService, OSRMService, PushNotificationsService, MailerService],
})
export class CommonModule { }
