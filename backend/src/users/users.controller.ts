import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getProfile(@Request() req) {
        return this.usersService.findOneById(req.user.userId);
    }

    // --- Preferences ---

    @UseGuards(AuthGuard('jwt'))
    @Patch('preferences')
    updatePreferences(@Request() req, @Body() body: any) {
        return this.usersService.updatePreferences(req.user.userId, body);
    }

    // --- Saved Places ---

    @UseGuards(AuthGuard('jwt'))
    @Get('saved-places')
    getSavedPlaces(@Request() req) {
        return this.usersService.getSavedPlaces(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('saved-places')
    addSavedPlace(@Request() req, @Body() body: any) {
        return this.usersService.addSavedPlace(req.user.userId, body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('saved-places/:id')
    deleteSavedPlace(@Request() req, @Param('id') id: string) {
        return this.usersService.deleteSavedPlace(req.user.userId, id);
    }

    // --- Drivers ---

    @Get('drivers/nearby')
    getNearbyDrivers(@Query('lat') lat: number, @Query('lon') lon: number) {
        return this.usersService.findNearbyDrivers(lat, lon);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('driver-profile')
    createDriverProfile(@Request() req, @Body() body) {
        return this.usersService.createDriverProfile(req.user, body);
    }
}
