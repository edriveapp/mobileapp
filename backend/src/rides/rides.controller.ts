import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RidesGateway } from './rides.gateway';
import { RidesService } from './rides.service';

// Strip passenger's last name before returning any ride to a driver over HTTP
function sanitizeForDriver(ride: any) {
    if (!ride?.passenger) return ride;
    const p = ride.passenger;
    const storedName: string = String(p.firstName || p.name || '').trim();
    const firstName = storedName.split(' ')[0] || p.email || p.phone || 'Passenger';
    return {
        ...ride,
        passenger: { id: p.id, firstName, lastName: '', email: p.email, phone: p.phone, rating: p.rating, avatarUrl: p.avatarUrl },
    };
}

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

    @UseGuards(AuthGuard('jwt'))
    @Get('available')
    async getAvailable(@Query() query) {
        return this.ridesService.getAvailableRides(query);
    }

    @Get('trending-areas')
    async getTrendingAreas(@Query('limit') limit?: string) {
        return this.ridesService.getTrendingAreas(Number(limit ?? 8));
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/cancel')
    async cancelRide(@Param('id') id: string, @Request() req) {
        const ride = await this.ridesService.cancelRideAsActor(id, req.user.userId);
        await this.ridesGateway.broadcastRideStatusUpdate(ride);
        return req.user.role === 'driver' ? sanitizeForDriver(ride) : ride;
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/accept')
    async acceptRide(@Param('id') id: string, @Request() req) {
        const updatedRide = await this.ridesService.acceptRide(id, req.user.userId);
        await this.ridesGateway.broadcastRideAccepted(updatedRide);
        return sanitizeForDriver(updatedRide);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/accept')
    async acceptRideLegacyPost(@Param('id') id: string, @Request() req) {
        const updatedRide = await this.ridesService.acceptRide(id, req.user.userId);
        await this.ridesGateway.broadcastRideAccepted(updatedRide);
        return sanitizeForDriver(updatedRide);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/book')
    async bookTrip(@Param('id') id: string, @Request() req, @Body() body) {
        const bookedRide = await this.ridesService.bookPublishedTrip(id, req.user.userId, body);
        await this.ridesGateway.broadcastTripBooked(bookedRide);
        return bookedRide; // passenger receives their own booking — no sanitization needed
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('book/:id')
    async bookTripLegacyPost(@Param('id') id: string, @Request() req, @Body() body) {
        const bookedRide = await this.ridesService.bookPublishedTrip(id, req.user.userId, body);
        await this.ridesGateway.broadcastTripBooked(bookedRide);
        return bookedRide;
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/book')
    async bookTripLegacyPatch(@Param('id') id: string, @Request() req, @Body() body) {
        const bookedRide = await this.ridesService.bookPublishedTrip(id, req.user.userId, body);
        await this.ridesGateway.broadcastTripBooked(bookedRide);
        return bookedRide;
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id')
    updateRide(@Param('id') id: string, @Request() req, @Body() body) {
        return this.ridesService.updateRideDetails(id, req.user.userId, body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/request')
    async updateRequest(@Param('id') id: string, @Request() req, @Body() body) {
        const updatedRide = await this.ridesService.updatePassengerRequestDetails(id, req.user.userId, body);
        await this.ridesGateway.broadcastRideRequestUpdated(updatedRide);
        return updatedRide;
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Request() req, @Body('status') status: any) {
        const ride = await this.ridesService.updateStatusAsActor(id, req.user.userId, status);
        await this.ridesGateway.broadcastRideStatusUpdate(ride);
        return req.user.role === 'driver' ? sanitizeForDriver(ride) : ride;
    }
}
