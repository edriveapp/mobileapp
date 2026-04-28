import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RidesModule } from '../rides/rides.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Booking } from '../rides/booking.entity';

@Module({
    imports: [HttpModule, RidesModule, TypeOrmModule.forFeature([User, Booking])],
    providers: [PaymentsService],
    controllers: [PaymentsController],
    exports: [PaymentsService],
})
export class PaymentsModule { }
