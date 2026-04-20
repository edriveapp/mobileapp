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

    // Verification status changes are admin-only — handled via admin controller

    @UseGuards(AuthGuard('jwt'))
    @Get('wallet')
    getWallet(@Request() req: any) {
        return this.usersService.getWallet(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('wallet/fund')
    fundWallet(@Request() req: any, @Body() body: { amount: number }) {
        return this.usersService.fundWallet(req.user.userId, Number(body.amount));
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('wallet/pay-commission')
    payCommission(@Request() req: any, @Body() body: { amount?: number }) {
        return this.usersService.payCommission(req.user.userId, body?.amount ? Number(body.amount) : undefined);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('push-token')
    registerPushToken(@Request() req, @Body() body: { token?: string }) {
        if (!body?.token) {
            return { success: false };
        }
        return this.usersService.registerExpoPushToken(req.user.userId, body.token);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('me')
    updateProfile(@Request() req, @Body() body: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }) {
        return this.usersService.updateProfile(req.user.userId, body);
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

    @UseGuards(AuthGuard('jwt'))
    @Get('drivers/nearby')
    getNearbyDrivers(@Query('lat') lat: number, @Query('lon') lon: number) {
        return this.usersService.findNearbyDrivers(lat, lon);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('driver-profile')
    createDriverProfile(@Request() req: any, @Body() body: any) {
        return this.usersService.createDriverProfile(req.user.userId, body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('driver-profile')
    getDriverProfile(@Request() req: any) {
        return this.usersService.getDriverProfile(req.user.userId);
    }
}
