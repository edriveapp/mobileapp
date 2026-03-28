import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RidesModule } from '../rides/rides.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
    imports: [HttpModule, RidesModule],
    providers: [PaymentsService],
    controllers: [PaymentsController],
    exports: [PaymentsService],
})
export class PaymentsModule { }
