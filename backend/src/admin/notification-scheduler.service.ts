import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdminService } from './admin.service';

@Injectable()
export class NotificationSchedulerService {
    private readonly logger = new Logger(NotificationSchedulerService.name);

    constructor(private readonly adminService: AdminService) {}

    /** Run every minute to check if any notification campaigns are due */
    @Cron(CronExpression.EVERY_MINUTE)
    async checkScheduledCampaigns() {
        try {
            await this.adminService.runScheduledNotifications();
        } catch (error) {
            this.logger.error('Failed to run scheduled notifications', error);
        }
    }
}
