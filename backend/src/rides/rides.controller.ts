import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RidesGateway } from './rides.gateway';
import { RidesService } from './rides.service';

@Controller('rides')
export class RidesController {
    constructor(
        private ridesService: RidesService,
        private ridesGateway: RidesGateway,
    ) { }

    @UseGuards(AuthGuard('jwt'))
    @Post('request')
    async requestRide(@Request() req, @Body() body) {
        // Passenger requesting a ride
        const ride = await this.ridesService.createRide({
            ...body,
            passengerId: req.user.userId,
            status: 'searching' // RideStatus.SEARCHING
        });
        await this.ridesGateway.broadcastNewRideRequest(ride);
        return ride;
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

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/accept')
    async acceptRide(@Param('id') id: string, @Request() req) {
        const updatedRide = await this.ridesService.acceptRide(id, req.user.userId);
        await this.ridesGateway.broadcastRideAccepted(updatedRide);
        return updatedRide;
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/book')
    async bookTrip(@Param('id') id: string, @Request() req, @Body() body) {
        const bookedRide = await this.ridesService.bookPublishedTrip(id, req.user.userId, body);
        await this.ridesGateway.broadcastTripBooked(bookedRide);
        return bookedRide;
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id')
    updateRide(@Param('id') id: string, @Request() req, @Body() body) {
        return this.ridesService.updateRideDetails(id, req.user.userId, body);
    }

    // Keep existing endpoints if needed for admin or general usage
    @Post()
    create(@Body() createRideDto: any) {
        return this.ridesService.createRide(createRideDto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: any) {
        return this.ridesService.updateStatus(id, status);
    }
}
