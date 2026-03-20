import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Ride } from './ride.entity';
import { RidesController } from './rides.controller';
import { RidesGateway } from './rides.gateway';
import { RidesService } from './rides.service';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [TypeOrmModule.forFeature([Ride]), CommonModule, UsersModule],
    providers: [RidesService, RidesGateway],
    controllers: [RidesController],
    exports: [RidesService, RidesGateway],
})
export class RidesModule { }
