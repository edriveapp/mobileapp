import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AdminScope, UserRole, VerificationStatus } from '../users/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('stats')
    getStats(@Request() req: any) {
        return this.adminService.getStats(req.user.userId);
    }

    @Get('analytics/overview')
    getOverviewAnalytics(@Request() req: any) {
        return this.adminService.getOverviewAnalytics(req.user.userId);
    }

    @Get('drivers/pending')
    getPendingDrivers(@Request() req: any) {
        return this.adminService.getPendingDrivers(req.user.userId);
    }

    @Get('users')
    getUsers(@Request() req: any) {
        return this.adminService.getUsers(req.user.userId);
    }

    @Get('rides')
    getRides(@Request() req: any) {
        return this.adminService.getRides(req.user.userId);
    }

    @Post('users/:id/verify')
    verifyUser(@Request() req: any, @Param('id') id: string, @Body() body: { status: VerificationStatus }) {
        return this.adminService.updateUserVerificationStatus(req.user.userId, id, body.status);
    }

    @Patch('users/:id/role')
    updateUserRole(@Request() req: any, @Param('id') id: string, @Body() body: { role: UserRole }) {
        return this.adminService.updateUserRole(req.user.userId, id, body.role);
    }

    @Patch('users/:id/admin-scope')
    updateAdminScope(@Request() req: any, @Param('id') id: string, @Body() body: { adminScope: AdminScope }) {
        return this.adminService.updateAdminScope(req.user.userId, id, body.adminScope);
    }

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
}
