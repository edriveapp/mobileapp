import { Global, Module } from '@nestjs/common';
import { OSRMService } from './osrm.service';
import { RedisService } from './redis.service';

@Global()
@Module({
    providers: [RedisService, OSRMService],
    exports: [RedisService, OSRMService],
})
export class CommonModule { }
