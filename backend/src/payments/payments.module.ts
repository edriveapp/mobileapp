import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RidesModule } from '../rides/rides.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';

@Module({
    imports: [HttpModule, RidesModule, TypeOrmModule.forFeature([User])],
    providers: [PaymentsService],
    controllers: [PaymentsController],
    exports: [PaymentsService],
})
export class PaymentsModule { }
