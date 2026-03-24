import { RidesModule } from '../rides/rides.module';

@Module({
    imports: [HttpModule, RidesModule],
    providers: [PaymentsService],
    controllers: [PaymentsController],
    exports: [PaymentsService],
})
export class PaymentsModule { }
