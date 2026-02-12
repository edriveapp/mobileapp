import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { RidesService } from './rides.service';

@Controller('rides')
export class RidesController {
    constructor(private ridesService: RidesService) { }

    @Post()
    create(@Body() createRideDto: any) {
        return this.ridesService.createRide(createRideDto);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: any) {
        return this.ridesService.updateStatus(id, status);
    }
}
