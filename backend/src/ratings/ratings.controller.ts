import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RatingsService } from './ratings.service';

@Controller('ratings')
export class RatingsController {
    constructor(private ratingsService: RatingsService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async createRating(@Request() req, @Body() body: any) {
        // body: { rideId, rateeId, value, comment }
        return this.ratingsService.createRating({
            ...body,
            raterId: req.user.userId
        });
    }

    @Get('user/:userId')
    async getUserRating(@Param('userId') userId: string) {
        const average = await this.ratingsService.getAverageRating(userId);
        return { average };
    }
}
