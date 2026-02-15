import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RidesService } from './rides.service';

@Controller('rides')
export class RidesController {
    constructor(private ridesService: RidesService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post('request')
    requestRide(@Request() req, @Body() body) {
        // Passenger requesting a ride
        return this.ridesService.createRide({
            ...body,
            passengerId: req.user.userId,
            status: 'searching' // RideStatus.SEARCHING
        });
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('publish')
    publishRide(@Request() req, @Body() body) {
        // Driver publishing a trip
        return this.ridesService.createRide({
            ...body,
            driverId: req.user.userId,
            status: 'searching'
        });
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('my-rides')
    async getMyRides(@Request() req) {
        const active = await this.ridesService.getActiveRides(req.user.userId, req.user.role);
        const [history, count] = await this.ridesService.getHistory(req.user.userId, req.user.role);
        return { active, history, count };
    }

    @Get('available')
    async getAvailable(@Query() query) {
        return this.ridesService.getAvailableRides(query);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/cancel')
    cancelRide(@Param('id') id: string) {
        // TODO: verify user owns the ride
        return this.ridesService.updateStatus(id, 'cancelled' as any);
    }

    // Keep existing endpoints if needed for admin or general usage
    @Post()
    create(@Body() createRideDto: any) {
        return this.ridesService.createRide(createRideDto);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: any) {
        return this.ridesService.updateStatus(id, status);
    }
}
