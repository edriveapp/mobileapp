import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@Controller('admin')
// In a real application, we would use an RolesGuard to protect these endpoints
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('stats')
    getStats() {
        return this.adminService.getStats();
    }

    @Get('drivers/pending')
    getPendingDrivers() {
        return this.adminService.getPendingDrivers();
    }

    @Get('users')
    getUsers() {
        return this.adminService.getUsers();
    }

    @Get('rides')
    getRides() {
        return this.adminService.getRides();
    }
}
