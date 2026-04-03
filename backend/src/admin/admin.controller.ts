import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AdminScope, UserRole, VerificationStatus } from '../users/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { CampaignRepeat } from './notification-campaign.entity';
import { WarningLevel } from './driver-warning.entity';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    // ─── Stats ─────────────────────────────────────────────────────────────────

    @Get('stats')
    getStats(@Request() req: any) {
        return this.adminService.getStats(req.user.userId);
    }

    @Get('analytics/overview')
    getOverviewAnalytics(@Request() req: any) {
        return this.adminService.getOverviewAnalytics(req.user.userId);
    }

    // ─── Platform Settings ─────────────────────────────────────────────────────

    @Get('settings')
    getPlatformSettings(@Request() req: any) {
        return this.adminService.getPlatformSettings(req.user.userId);
    }

    @Patch('settings')
    updatePlatformSettings(@Request() req: any, @Body() body: { platformCutPercent: number }) {
        return this.adminService.updatePlatformSettings(req.user.userId, body);
    }

    // ─── Driver Management ─────────────────────────────────────────────────────

    @Get('drivers/pending')
    getPendingDrivers(@Request() req: any) {
        return this.adminService.getPendingDrivers(req.user.userId);
    }

    @Get('drivers')
    getAllDrivers(@Request() req: any) {
        return this.adminService.getAllDrivers(req.user.userId);
    }

    @Get('drivers/:id')
    getDriverDetail(@Request() req: any, @Param('id') id: string) {
        return this.adminService.getDriverDetail(req.user.userId, id);
    }

    @Post('drivers/:id/warn')
    warnDriver(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { level: WarningLevel; reason: string },
    ) {
        return this.adminService.warnDriver(req.user.userId, id, body.level, body.reason);
    }

    @Post('drivers/:id/restrict')
    restrictDriver(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { restrict: boolean },
    ) {
        return this.adminService.toggleDriverRestriction(req.user.userId, id, body.restrict);
    }

    @Post('users/:id/verify')
    verifyUser(@Request() req: any, @Param('id') id: string, @Body() body: { status: VerificationStatus }) {
        return this.adminService.updateUserVerificationStatus(req.user.userId, id, body.status);
    }

    // ─── Users & Rides ─────────────────────────────────────────────────────────

    @Get('users')
    getUsers(@Request() req: any) {
        return this.adminService.getUsers(req.user.userId);
    }

    @Get('rides')
    getRides(@Request() req: any) {
        return this.adminService.getRides(req.user.userId);
    }

    @Patch('users/:id/role')
    updateUserRole(@Request() req: any, @Param('id') id: string, @Body() body: { role: UserRole }) {
        return this.adminService.updateUserRole(req.user.userId, id, body.role);
    }

    @Patch('users/:id/admin-scope')
    updateAdminScope(@Request() req: any, @Param('id') id: string, @Body() body: { adminScope: AdminScope }) {
        return this.adminService.updateAdminScope(req.user.userId, id, body.adminScope);
    }

    // ─── Team ──────────────────────────────────────────────────────────────────

    @Get('team')
    getTeamMembers(@Request() req: any) {
        return this.adminService.getTeamMembers(req.user.userId);
    }

    @Post('team/admins')
    createSubAdmin(
        @Request() req: any,
        @Body() body: {
            email: string;
            password: string;
            firstName?: string;
            lastName?: string;
            adminScope: AdminScope;
        },
    ) {
        return this.adminService.createSubAdmin(req.user.userId, body);
    }

    // ─── OTA Notification Campaigns ────────────────────────────────────────────

    @Get('campaigns')
    getCampaigns(@Request() req: any) {
        return this.adminService.getCampaigns(req.user.userId);
    }

    @Post('campaigns')
    createCampaign(
        @Request() req: any,
        @Body()
        body: {
            title: string;
            body: string;
            repeat: CampaignRepeat;
            dayOfWeek?: number | null;
            sendTime: string;
        },
    ) {
        return this.adminService.createCampaign(req.user.userId, body);
    }

    @Patch('campaigns/:id')
    updateCampaign(@Request() req: any, @Param('id') id: string, @Body() body: any) {
        return this.adminService.updateCampaign(req.user.userId, id, body);
    }

    @Delete('campaigns/:id')
    deleteCampaign(@Request() req: any, @Param('id') id: string) {
        return this.adminService.deleteCampaign(req.user.userId, id);
    }

    @Post('campaigns/:id/send-now')
    sendCampaignNow(@Request() req: any, @Param('id') id: string) {
        return this.adminService.sendCampaignNow(req.user.userId, id);
    }
}
