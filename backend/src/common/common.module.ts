import { Global, Module } from '@nestjs/common';
import { OSRMService } from './osrm.service';
import { PushNotificationsService } from './push-notifications.service';
import { RedisService } from './redis.service';

@Global()
@Module({
    providers: [RedisService, OSRMService, PushNotificationsService],
    exports: [RedisService, OSRMService, PushNotificationsService],
})
export class CommonModule { }
