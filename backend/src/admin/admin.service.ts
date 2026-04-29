import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { generateDriverVerificationEmail, generateDriverWarningEmail } from '../common/emailTemplate';
import { BatchEmailMessage, MailerService } from '../common/mailer.service';
import { PushNotificationsService } from '../common/push-notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { AdminScope, User, UserRole, VerificationStatus } from '../users/user.entity';
import { WalletTransaction, WalletTransactionType } from '../users/wallet-transaction.entity';
import { Ride, RideStatus } from '../rides/ride.entity';
import { Booking, BookingStatus } from '../rides/booking.entity';
import { Rating } from '../ratings/rating.entity';
import { buildTrendingAreas, extractAreaName } from '../rides/trending-areas.util';
import { SupportMessage } from '../support/support-message.entity';
import { SupportTicket, SupportTicketStatus } from '../support/support-ticket.entity';
import { generateBroadcastEmailHtml } from '../common/emailTemplate';
import { DriverWarning, WarningLevel } from './driver-warning.entity';
import { CampaignRepeat, CampaignStatus, NotificationCampaign } from './notification-campaign.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Ride)
        private ridesRepository: Repository<Ride>,
        @InjectRepository(Booking)
        private bookingsRepository: Repository<Booking>,
        @InjectRepository(Rating)
        private ratingsRepository: Repository<Rating>,
        @InjectRepository(DriverWarning)
        private warningsRepository: Repository<DriverWarning>,
        @InjectRepository(NotificationCampaign)
        private campaignsRepository: Repository<NotificationCampaign>,
        @InjectRepository(SupportTicket)
        private ticketsRepository: Repository<SupportTicket>,
        @InjectRepository(SupportMessage)
        private supportMessagesRepository: Repository<SupportMessage>,
        @InjectRepository(WalletTransaction)
        private walletTransactionsRepository: Repository<WalletTransaction>,
        private readonly mailerService: MailerService,
        private readonly pushService: PushNotificationsService,
        private readonly paymentsService: PaymentsService,
    ) {}

    // ─── RBAC Helpers ──────────────────────────────────────────────────────────

    private async getActor(actorUserId: string) {
        const actor = await this.usersRepository.findOne({ where: { id: actorUserId } });
        if (!actor) throw new NotFoundException('Admin user not found');
        return actor;
    }

    private assertAdmin(actor: User) {
        if (actor.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Admin access required');
        }
    }

    private assertSuperAdmin(actor: User) {
        this.assertAdmin(actor);
        if (actor.adminScope !== AdminScope.SUPER_ADMIN) {
            throw new ForbiddenException('Only super admin can manage roles');
        }
    }

    private assertVerificationAdmin(actor: User) {
        this.assertAdmin(actor);
        if (![AdminScope.SUPER_ADMIN, AdminScope.VERIFICATION].includes(actor.adminScope)) {
            throw new ForbiddenException('Verification admin access required');
        }
    }

    private assertSupportAdmin(actor: User) {
        this.assertAdmin(actor);
        if (![AdminScope.SUPER_ADMIN, AdminScope.SUPPORT, AdminScope.OPERATIONS].includes(actor.adminScope)) {
            throw new ForbiddenException('Support admin access required');
        }
    }

    private assertOperationsAdmin(actor: User) {
        this.assertAdmin(actor);
        if (![AdminScope.SUPER_ADMIN, AdminScope.OPERATIONS].includes(actor.adminScope)) {
            throw new ForbiddenException('Operations admin access required');
        }
    }

    private async recordWalletTransaction(payload: {
        userId: string;
        type: WalletTransactionType;
        amount: number;
        description: string;
        direction?: 'credit' | 'debit' | null;
        rideId?: string | null;
        paymentReference?: string | null;
        metadata?: Record<string, any> | null;
    }) {
        const transaction = this.walletTransactionsRepository.create({
            userId: payload.userId,
            type: payload.type,
            amount: payload.amount,
            description: payload.description,
            direction: payload.direction ?? null,
            rideId: payload.rideId ?? null,
            paymentReference: payload.paymentReference ?? null,
            metadata: payload.metadata ?? null,
        });
        await this.walletTransactionsRepository.save(transaction);
    }

    // ─── Stats & Analytics ─────────────────────────────────────────────────────

    async getStats(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);
        const totalUsers = await this.usersRepository.count({ where: { role: UserRole.PASSENGER } });
        const totalDrivers = await this.usersRepository.count({ where: { role: UserRole.DRIVER } });
        const completedRides = await this.ridesRepository.find({ where: { status: RideStatus.COMPLETED } });
        const activeUsersData = await this.getOperationalActiveUsers();

        const gmv = completedRides.reduce((sum, r) => sum + Number(r.tripFare || 0), 0);
        const platformRevenue = completedRides.reduce((sum, r) => sum + Number(r.platformCut || 0), 0);

        return {
            gmv,
            arr: platformRevenue * 12,
            totalRides: await this.ridesRepository.count(),
            totalUsers,
            totalDrivers,
            activeUsers: activeUsersData.total,
            activeUsersBreakdown: activeUsersData.breakdown,
        };
    }

    async getOverviewAnalytics(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const stats = await this.getStats(actorUserId);
        const completedRides = await this.ridesRepository.find({
            where: { status: RideStatus.COMPLETED },
            order: { createdAt: 'ASC' },
        });
        const trendingAreasSource = await this.ridesRepository.find({
            where: { updatedAt: MoreThanOrEqual(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) },
            order: { updatedAt: 'DESC' },
            take: 5000,
        });

        const revenueSeries = this.buildRevenueSeries(completedRides);
        const trendingAreas = buildTrendingAreas(trendingAreasSource, 8);
        const topLeavingAreas = this.buildAreaDirectionVolumes(trendingAreasSource, 'origin');
        const topArrivingAreas = this.buildAreaDirectionVolumes(trendingAreasSource, 'destination');
        const cityVolumes = trendingAreas.map((area) => ({
            name: area.name,
            rides: area.rides7d,
            trendScore: area.trendScore,
            rides24h: area.rides24h,
            growthRate: area.growthRate,
            uniqueUsers: area.uniqueUsers,
        }));

        return {
            stats,
            revenueSeries,
            cityVolumes,
            trendingAreas,
            topLeavingAreas,
            topArrivingAreas,
            generatedAt: new Date().toISOString(),
        };
    }

    // ─── Platform Settings (Commission Cut) ────────────────────────────────────

    async getPlatformSettings(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);
        // Settings stored as a special admin user with email = '__settings__'
        const settings = await this.usersRepository.findOne({ where: { email: '__settings__' } });
        const prefs = (settings?.preferences as any) || {};
        return {
            platformCutPercent: prefs.platformCutPercent ?? 15,
            baseFare: prefs.baseFare ?? 500,
            minimumFare: prefs.minimumFare ?? 1000,
            surgeMultiplier: prefs.surgeMultiplier ?? 1.0,
            cancellationFee: prefs.cancellationFee ?? 500,
        };
    }

    async updatePlatformSettings(actorUserId: string, settings: any) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);
        if (settings.platformCutPercent !== undefined && (settings.platformCutPercent < 0 || settings.platformCutPercent > 100)) {
            throw new BadRequestException('Platform cut must be between 0 and 100');
        }
        let settingsUser = await this.usersRepository.findOne({ where: { email: '__settings__' } });
        if (!settingsUser) {
            settingsUser = this.usersRepository.create({
                email: '__settings__',
                passwordHash: 'n/a',
                firstName: 'Platform',
                lastName: 'Settings',
                role: UserRole.ADMIN,
                adminScope: AdminScope.NONE,
                preferences: { pushNotifications: false, emailNotifications: false, biometricLogin: false },
            });
        }
        (settingsUser.preferences as any) = {
            ...(settingsUser.preferences || {}),
            ...settings,
        };
        await this.usersRepository.save(settingsUser);
        return this.getPlatformSettings(actorUserId);
    }

    // ─── Driver Management ─────────────────────────────────────────────────────

    async getPendingDrivers(actorUserId: string): Promise<User[]> {
        const actor = await this.getActor(actorUserId);
        this.assertVerificationAdmin(actor);
        const drivers = await this.usersRepository.find({
            where: { verificationStatus: VerificationStatus.PENDING },
            relations: ['driverProfile'],
            order: { createdAt: 'DESC' }
        });
        return drivers.map((user) => this.toSafeUser(user));
    }

    async getAllDrivers(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);
        const drivers = await this.usersRepository.find({
            where: { role: UserRole.DRIVER },
            relations: ['driverProfile'],
            order: { createdAt: 'DESC' },
        });
        return drivers.map((user) => this.toSafeUser(user));
    }

    async getDriverDetail(actorUserId: string, driverId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const driver = await this.usersRepository.findOne({
            where: { id: driverId },
            relations: ['driverProfile'],
        });
        if (!driver) throw new NotFoundException('Driver not found');

        const rides = await this.ridesRepository.find({
            where: { driverId },
            order: { createdAt: 'DESC' },
            take: 50,
        });

        const reviews = await this.ratingsRepository.find({
            where: { rateeId: driverId },
            relations: ['rater'],
            order: { createdAt: 'DESC' },
            take: 50,
        });

        const warnings = await this.warningsRepository.find({
            where: { driverId },
            relations: ['issuedBy'],
            order: { createdAt: 'DESC' },
        });

        const totalEarnings = rides
            .filter((r) => r.status === RideStatus.COMPLETED)
            .reduce((sum, r) => sum + Number(r.driverNetEarnings || r.driverEarnings || 0), 0);

        return {
            driver: this.toSafeUser(driver),
            rides: rides.map((r) => ({
                id: r.id,
                origin: (r.origin as any)?.address || r.origin,
                destination: (r.destination as any)?.address || r.destination,
                status: r.status,
                fare: Number(r.tripFare || 0),
                date: new Date(r.createdAt).toLocaleDateString(),
            })),
            reviews: reviews.map((rv) => ({
                id: rv.id,
                rating: rv.value,
                comment: rv.comment,
                raterName: rv.rater ? `${rv.rater.firstName || ''} ${rv.rater.lastName || ''}`.trim() || rv.rater.email : 'Anonymous',
                date: new Date(rv.createdAt).toLocaleDateString(),
            })),
            warnings: warnings.map((w) => ({
                id: w.id,
                level: w.level,
                reason: w.reason,
                issuedBy: w.issuedBy ? `${w.issuedBy.firstName || ''} ${w.issuedBy.lastName || ''}`.trim() || w.issuedBy.email : 'Admin',
                date: new Date(w.createdAt).toLocaleDateString(),
            })),
            stats: {
                totalRides: rides.length,
                completedRides: rides.filter((r) => r.status === RideStatus.COMPLETED).length,
                totalEarnings: Number(totalEarnings.toFixed(2)),
                averageRating: driver.rating,
            },
        };
    }

    async warnDriver(actorUserId: string, driverId: string, level: WarningLevel, reason: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const driver = await this.usersRepository.findOne({ where: { id: driverId } });
        if (!driver) throw new NotFoundException('Driver not found');

        const warning = this.warningsRepository.create({
            driverId,
            issuedById: actorUserId,
            level,
            reason,
        });
        await this.warningsRepository.save(warning);

        // Notify driver via push
        if (driver.expoPushTokens?.length) {
            await this.pushService.sendToExpoTokens(
                driver.expoPushTokens,
                '⚠️ Account Warning',
                `You have received a ${level} warning: ${reason}`,
                { type: 'admin_warning', level }
            );
        }

        // Email the driver using edrive branded template
        const driverName = `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'Driver';
        await this.mailerService.sendEmail(
            [driver.email],
            `edrive Account Warning – ${level.toUpperCase()}`,
            generateDriverWarningEmail({ driverName, level, reason }),
            `You have received a ${level} warning: ${reason}`,
            { from: 'safety@edriveapp.com' },
        );

        return { success: true, warning };
    }

    async toggleUserRestriction(actorUserId: string, userId: string, restrict: boolean) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        user.isRestricted = restrict;
        await this.usersRepository.save(user);

        // Notify if user is a driver or passenger via push
        if (user.expoPushTokens?.length) {
            await this.pushService.sendToExpoTokens(
                user.expoPushTokens,
                restrict ? '🔒 Account Restricted' : '✅ Account Reinstated',
                restrict
                    ? 'Your account has been restricted. Please contact support.'
                    : 'Your account has been reinstated. You can now use the app.',
                { type: 'admin_restriction', restricted: restrict }
            );
        }

        // Email the user
        await this.mailerService.sendEmail(
            [user.email],
            `edrive Account ${restrict ? 'Restricted' : 'Reinstated'}`,
            `<p>Hello ${user.firstName || 'User'},</p><p>Your edrive account has been <strong>${restrict ? 'restricted' : 'reinstated'}</strong> by admin.</p>`,
            `Your edrive account has been ${restrict ? 'restricted' : 'reinstated'}.`,
            { from: 'safety@edriveapp.com' },
        );

        return { success: true, isRestricted: user.isRestricted };
    }

    async deleteUser(actorUserId: string, userId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);

        if (userId === actorUserId) {
            throw new ForbiddenException('You cannot delete your own account');
        }

        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        if (user.role === UserRole.ADMIN && user.adminScope === AdminScope.SUPER_ADMIN) {
            throw new ForbiddenException('Super admin accounts cannot be deleted');
        }

        // Capture details for notifications before deletion
        const userEmail = user.email;
        const pushTokens = user.expoPushTokens || [];
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

        // Note: For a real production app, you might want to soft-delete
        // or ensure no orphaned records (rides, payments, etc.)
        await this.usersRepository.delete(userId);

        if (pushTokens.length) {
            await this.pushService.sendToExpoTokens(
                pushTokens,
                'Account Deleted',
                'Your edrive account has been permanently deleted by the administrator.',
                { type: 'account_deleted' }
            );
        }

        if (this.isValidEmail(userEmail)) {
            await this.mailerService.sendEmail(
                [userEmail],
                'Your edrive Account Has Been Deleted',
                `<p>Hello ${userName},</p><p>Your edrive account has been permanently deleted by an administrator.</p><p>If you believe this was a mistake, please contact support.</p>`,
                'Your edrive account has been deleted by an admin.',
                { from: 'safety@edriveapp.com' }
            );
        }

        return { success: true };
    }

    async updateUserVerificationStatus(actorUserId: string, userId: string, status: VerificationStatus): Promise<User> {
        const actor = await this.getActor(actorUserId);
        this.assertVerificationAdmin(actor);
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['driverProfile']
        });
        if (!user) throw new NotFoundException('User not found');

        user.verificationStatus = status;
        if (status === VerificationStatus.APPROVED && user.driverProfile) {
            user.driverProfile.isVerified = true;
            await this.usersRepository.manager.save(user.driverProfile);
        }

        const saved = await this.usersRepository.save(user);

        // Notify the driver
        if (saved.expoPushTokens?.length) {
            await this.pushService.sendToExpoTokens(
                saved.expoPushTokens,
                status === VerificationStatus.APPROVED ? '✅ Verification Approved' : '❌ Verification Update',
                status === VerificationStatus.APPROVED
                    ? 'Congratulations! Your driver account has been verified. You can now accept rides.'
                    : `Your verification status has been updated to: ${status}. Please contact support for help.`,
            );
        }

        // Email the driver with branded edrive template
        const driverName = `${saved.firstName || ''} ${saved.lastName || ''}`.trim() || 'Driver';
        const emailableStatuses: VerificationStatus[] = [VerificationStatus.APPROVED, VerificationStatus.REJECTED, VerificationStatus.PENDING];
        if (emailableStatuses.includes(status) && saved.email) {
            const subjectMap: Record<string, string> = {
                [VerificationStatus.APPROVED]: 'Your edrive Driver Account Has Been Approved',
                [VerificationStatus.REJECTED]: 'edrive Verification Update',
                [VerificationStatus.PENDING]: 'Your edrive Documents Are Under Review',
            };
            await this.mailerService.sendEmail(
                [saved.email],
                subjectMap[status] || `edrive Verification: ${status}`,
                generateDriverVerificationEmail({ driverName, status: status as 'approved' | 'rejected' | 'pending' }),
                `Your edrive driver verification status has been updated to: ${status}.`,
                { from: 'support@edriveapp.com' },
            );
        }

        // Notify the verification team
        const verificationTeam = await this.getAdminEmailsByScopes([AdminScope.SUPER_ADMIN, AdminScope.VERIFICATION, AdminScope.OPERATIONS]);
        await this.mailerService.sendEmail(
            verificationTeam,
            `Driver verification ${status}: ${saved.email}`,
            `<p>Driver <strong>${saved.email}</strong> verification status changed to <strong>${status}</strong>.</p>`,
            `Driver ${saved.email} verification status changed to ${status}.`,
            { from: 'support@edriveapp.com' },
        );

        return this.toSafeUser(saved);
    }

    // ─── OTA Notification Campaigns ────────────────────────────────────────────

    async getCampaigns(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);
        return this.campaignsRepository.find({ order: { createdAt: 'DESC' } });
    }

    async createCampaign(
        actorUserId: string,
        payload: {
            title: string;
            body: string;
            repeat: CampaignRepeat;
            dayOfWeek?: number | null;
            sendTime: string;
        },
    ) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const campaign = this.campaignsRepository.create({
            ...payload,
            status: CampaignStatus.ACTIVE,
            nextSendAt: this.computeNextSend(payload.repeat, payload.sendTime, payload.dayOfWeek),
        });
        return this.campaignsRepository.save(campaign);
    }

    async updateCampaign(actorUserId: string, id: string, patch: Partial<NotificationCampaign>) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const campaign = await this.campaignsRepository.findOne({ where: { id } });
        if (!campaign) throw new NotFoundException('Campaign not found');

        Object.assign(campaign, patch);
        if (patch.repeat || patch.sendTime || patch.dayOfWeek !== undefined) {
            campaign.nextSendAt = this.computeNextSend(campaign.repeat, campaign.sendTime, campaign.dayOfWeek);
        }
        return this.campaignsRepository.save(campaign);
    }

    async deleteCampaign(actorUserId: string, id: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);
        await this.campaignsRepository.delete(id);
        return { success: true };
    }

    async sendCampaignNow(actorUserId: string, id: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const campaign = await this.campaignsRepository.findOne({ where: { id } });
        if (!campaign) throw new NotFoundException('Campaign not found');

        await this.broadcastCampaign(campaign);
        return { success: true };
    }

    async getBroadcastAudienceSummary(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const recipients = await this.usersRepository.find({
            where: [{ role: UserRole.PASSENGER }, { role: UserRole.DRIVER }],
            select: {
                id: true,
                email: true,
                role: true,
                isRestricted: true,
            },
        });

        const eligible = recipients.filter((user) => !user.isRestricted && this.isValidEmail(user.email));
        const users = eligible.filter((user) => user.role === UserRole.PASSENGER);
        const drivers = eligible.filter((user) => user.role === UserRole.DRIVER);

        return {
            defaultSenderEmail: this.mailerService.getDefaultFromEmail(),
            segments: [
                {
                    id: 'all',
                    label: 'All Recipients',
                    description: 'All passenger and driver emails from the backend',
                    count: eligible.length,
                    color: '#16a34a',
                },
                {
                    id: 'passengers',
                    label: 'Passengers',
                    description: 'Passenger accounts only',
                    count: users.length,
                    color: '#2563eb',
                },
                {
                    id: 'drivers',
                    label: 'Drivers',
                    description: 'Driver accounts only',
                    count: drivers.length,
                    color: '#7c3aed',
                },
            ],
        };
    }

    async sendBroadcastEmail(
        actorUserId: string,
        payload: {
            senderEmail?: string;
            caption: string;
            subheading?: string;
            bodyHtml: string;
            previewText?: string;
            segments?: string[];
            manualEmails?: string[];
        },
    ) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        if (!payload.caption?.trim()) throw new BadRequestException('Caption is required');
        if (!payload.bodyHtml?.trim()) throw new BadRequestException('Body is required');

        const senderEmail = (payload.senderEmail?.trim().toLowerCase() || 'info@edriveapp.com').trim();
        if (!this.isValidEmail(senderEmail)) throw new BadRequestException('Sender email is invalid');

        const requestedSegments = Array.from(new Set((payload.segments || []).map((v) => String(v).trim().toLowerCase()).filter(Boolean)));
        const manualEmails = Array.from(
            new Set((payload.manualEmails || []).map((v) => String(v).trim().toLowerCase()).filter((v) => this.isValidEmail(v))),
        );

        const segmentRecipients = await this.resolveBroadcastRecipients(requestedSegments);

        // Merge segment + manual recipients, deduped by email
        const recipientMap = new Map<string, { email: string; firstName: string }>();
        for (const r of segmentRecipients) recipientMap.set(r.email, r);
        for (const email of manualEmails) {
            if (!recipientMap.has(email)) recipientMap.set(email, { email, firstName: '' });
        }
        const recipients = Array.from(recipientMap.values());

        if (!recipients.length) {
            throw new BadRequestException('No valid recipients resolved from the selected audience');
        }

        // Build template once — {{firstname}} placeholder survives sanitization
        const templateHtml = generateBroadcastEmailHtml({
            caption: payload.caption.trim(),
            subheading: payload.subheading?.trim(),
            bodyHtml: payload.bodyHtml,
            previewText: payload.previewText?.trim(),
            supportEmail: 'support@edriveapp.com',
        });
        const templateText = this.htmlToText(payload.bodyHtml);

        // Personalize per recipient and build batch messages
        const messages: BatchEmailMessage[] = recipients.map(({ email, firstName }) => {
            const name = firstName || 'there';
            return {
                to: email,
                from: senderEmail,
                subject: payload.caption.trim(),
                html: templateHtml.replace(/\{\{firstname\}\}/gi, name),
                text: templateText.replace(/\{\{firstname\}\}/gi, name),
            };
        });

        await this.mailerService.sendBatch(messages);

        return {
            success: true,
            senderEmail,
            segmentCount: segmentRecipients.length,
            manualCount: manualEmails.length,
            totalRecipients: recipients.length,
        };
    }

    /** Called by the scheduler every minute */
    async runScheduledNotifications() {
        const now = new Date();
        const campaigns = await this.campaignsRepository.find({
            where: { status: CampaignStatus.ACTIVE },
        });

        for (const campaign of campaigns) {
            if (!campaign.nextSendAt) continue;
            if (campaign.nextSendAt > now) continue;

            await this.broadcastCampaign(campaign);

            if (campaign.repeat === CampaignRepeat.ONCE) {
                campaign.status = CampaignStatus.EXPIRED;
                campaign.nextSendAt = null;
            } else {
                campaign.nextSendAt = this.computeNextSend(campaign.repeat, campaign.sendTime, campaign.dayOfWeek);
            }
            campaign.lastSentAt = now;
            await this.campaignsRepository.save(campaign);
        }
    }

    private async broadcastCampaign(campaign: NotificationCampaign) {
        // Optimize query to fetch only push tokens to prevent memory bloat and connection timeouts
        const users = await this.usersRepository
            .createQueryBuilder('user')
            .select(['user.expoPushTokens'])
            .where('user.role IN (:...roles)', { roles: [UserRole.PASSENGER, UserRole.DRIVER] })
            .andWhere('user.isRestricted = false')
            .getMany();

        const allTokens: string[] = [];
        for (const u of users) {
            if (Array.isArray(u.expoPushTokens)) {
                allTokens.push(...u.expoPushTokens);
            }
        }

        if (allTokens.length) {
            await this.pushService.sendToExpoTokens(allTokens, campaign.title, campaign.body);
        }
    }

    private computeNextSend(repeat: CampaignRepeat, sendTime: string, dayOfWeek?: number | null): Date {
        const [hours, minutes] = sendTime.split(':').map(Number);
        const now = new Date();
        const candidate = new Date();
        candidate.setHours(hours, minutes, 0, 0);

        if (candidate <= now) {
            candidate.setDate(candidate.getDate() + 1);
        }

        if (repeat === CampaignRepeat.ONCE || repeat === CampaignRepeat.DAILY) {
            return candidate;
        }

        if (repeat === CampaignRepeat.WEEKLY && dayOfWeek != null) {
            while (candidate.getDay() !== dayOfWeek) {
                candidate.setDate(candidate.getDate() + 1);
            }
            return candidate;
        }

        if (repeat === CampaignRepeat.WEEKDAYS) {
            while (candidate.getDay() === 0 || candidate.getDay() === 6) {
                candidate.setDate(candidate.getDate() + 1);
            }
            return candidate;
        }

        if (repeat === CampaignRepeat.WEEKENDS) {
            while (candidate.getDay() !== 0 && candidate.getDay() !== 6) {
                candidate.setDate(candidate.getDate() + 1);
            }
            return candidate;
        }

        return candidate;
    }

    private async resolveBroadcastRecipients(segmentIds: string[]): Promise<{ email: string; firstName: string }[]> {
        if (!segmentIds.length) return [];

        const normalized = new Set(segmentIds);
        const wantsGeneral = normalized.has('general') || normalized.has('all');
        const wantsUsers = normalized.has('users') || normalized.has('riders') || normalized.has('passengers');
        const wantsDrivers = normalized.has('drivers');

        const source = await this.usersRepository.find({
            where: [{ role: UserRole.PASSENGER }, { role: UserRole.DRIVER }],
            select: { email: true, firstName: true, role: true, isRestricted: true },
        });

        const seen = new Set<string>();
        const results: { email: string; firstName: string }[] = [];

        for (const user of source) {
            if (user.isRestricted || !this.isValidEmail(user.email)) continue;
            if (!wantsGeneral) {
                if (wantsUsers && user.role !== UserRole.PASSENGER) continue;
                if (wantsDrivers && user.role !== UserRole.DRIVER) continue;
                if (!wantsUsers && !wantsDrivers) continue;
            }
            const email = user.email.trim().toLowerCase();
            if (seen.has(email)) continue;
            seen.add(email);
            results.push({ email, firstName: (user.firstName || '').trim() });
        }

        return results;
    }

    private isValidEmail(value?: string | null) {
        return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    }

    private htmlToText(html: string) {
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    // ─── Users & Rides ─────────────────────────────────────────────────────────

    async getUsers(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);
        const users = await this.usersRepository.find({
            relations: ['driverProfile'],
            order: { createdAt: 'DESC' },
            take: 100
        });
        return users.map((user) => this.toSafeUser(user));
    }

    async getRides(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);
        const rides = await this.ridesRepository.find({
            relations: ['driver', 'passenger'],
            order: { createdAt: 'DESC' },
            take: 50
        });

        return rides.map(r => ({
            id: `EDR-${r.id.slice(0, 5).toUpperCase()}`,
            origin: (r.origin as any)?.address || r.origin,
            destination: (r.destination as any)?.address || r.destination,
            status: r.status,
            driverName: r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : 'N/A',
            gmv: Number(r.tripFare || 0),
            platformCut: Number(r.platformCut || 0),
            date: new Date(r.createdAt).toLocaleDateString()
        }));
    }

    async updateUserRole(actorUserId: string, userId: string, role: UserRole) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);
        if (!Object.values(UserRole).includes(role)) {
            throw new BadRequestException('Invalid role');
        }
        await this.usersRepository.update(userId, { role });
        const user = await this.usersRepository.findOne({ where: { id: userId }, relations: ['driverProfile'] });
        if (!user) throw new NotFoundException('User not found');
        return this.toSafeUser(user);
    }

    async updateAdminScope(actorUserId: string, userId: string, adminScope: AdminScope) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);
        if (!Object.values(AdminScope).includes(adminScope)) {
            throw new BadRequestException('Invalid admin scope');
        }
        await this.usersRepository.update(userId, { adminScope });
        const user = await this.usersRepository.findOne({ where: { id: userId }, relations: ['driverProfile'] });
        if (!user) throw new NotFoundException('User not found');
        return this.toSafeUser(user);
    }

    async getTeamMembers(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);
        const users = await this.usersRepository.find({
            where: { role: UserRole.ADMIN },
            order: { createdAt: 'DESC' },
        });
        return users.map((user) => this.toSafeUser(user));
    }

    async createSubAdmin(
        actorUserId: string,
        payload: { email: string; password: string; firstName?: string; lastName?: string; adminScope: AdminScope },
    ) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);

        if (!payload.email?.trim() || !payload.password?.trim()) {
            throw new BadRequestException('Email and password are required');
        }
        if (![AdminScope.VERIFICATION, AdminScope.SUPPORT, AdminScope.OPERATIONS].includes(payload.adminScope)) {
            throw new BadRequestException('Sub-admin scope must be verification, support, or operations');
        }

        const existing = await this.usersRepository.findOne({ where: { email: payload.email.trim().toLowerCase() } });
        if (existing) {
            await this.usersRepository.update(existing.id, {
                role: UserRole.ADMIN,
                adminScope: payload.adminScope,
                passwordHash: await bcrypt.hash(payload.password, 12),
                firstName: payload.firstName || existing.firstName,
                lastName: payload.lastName || existing.lastName,
            });
            const refreshed = await this.usersRepository.findOne({ where: { id: existing.id } });
            if (!refreshed) throw new NotFoundException('User not found');
            return this.toSafeUser(refreshed);
        }

        const created = this.usersRepository.create({
            email: payload.email.trim().toLowerCase(),
            passwordHash: await bcrypt.hash(payload.password, 12),
            firstName: payload.firstName || '',
            lastName: payload.lastName || '',
            role: UserRole.ADMIN,
            adminScope: payload.adminScope,
        });
        const saved = await this.usersRepository.save(created);

        await this.mailerService.sendEmail(
            [saved.email],
            'Your edrive admin account is ready',
            `<p>Hello ${saved.firstName || 'Admin'}, your admin account has been created with <strong>${payload.adminScope}</strong> scope.</p>`,
            `Your admin account has been created with ${payload.adminScope} scope.`,
            { from: 'no-reply@edriveapp.com' },
        );

        return this.toSafeUser(saved);
    }

    // ─── Ride Management ──────────────────────────────────────────────────────

    async getRideDetail(actorUserId: string, rideId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const ride = await this.ridesRepository.findOne({
            where: { id: rideId },
            relations: ['driver', 'driver.driverProfile', 'passenger'],
        });
        if (!ride) throw new NotFoundException('Ride not found');

        const ratings = await this.ratingsRepository.find({ where: { rideId } });

        return {
            id: ride.id,
            status: ride.status,
            paymentStatus: ride.paymentStatus,
            paymentMethod: ride.paymentMethod,
            paystackReference: ride.paystackReference,
            paymentReference: ride.paymentReference,
            refundReference: ride.refundReference,
            refundReason: ride.refundReason,
            fare: Number(ride.tripFare || 0),
            driverEarnings: Number(ride.driverNetEarnings || ride.driverEarnings || 0),
            platformCut: Number(ride.platformCutAmount || ride.platformCut || 0),
            platformCutPercent: Number(ride.platformCutPercent || 0),
            insuranceReserveAmount: Number(ride.insuranceReserveAmount || 0),
            insuranceReservePercent: Number(ride.insuranceReservePercent || 0),
            payoutStatus: ride.payoutStatus,
            estimatedDurationMinutes: ride.estimatedDurationMinutes,
            distanceKm: ride.distanceKm,
            origin: ride.origin,
            destination: ride.destination,
            departureTime: ride.departureTime,
            createdAt: ride.createdAt,
            updatedAt: ride.updatedAt,
            driver: ride.driver ? this.toSafeUser(ride.driver) : null,
            passenger: ride.passenger ? this.toSafeUser(ride.passenger) : null,
            ratings,
        };
    }

    async forceCancelRide(actorUserId: string, rideId: string, reason: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const ride = await this.ridesRepository.findOne({
            where: { id: rideId },
            relations: ['driver', 'passenger'],
        });
        if (!ride) throw new NotFoundException('Ride not found');

        const nonCancellable = [RideStatus.COMPLETED, RideStatus.CANCELLED];
        if (nonCancellable.includes(ride.status)) {
            throw new BadRequestException(`Cannot cancel a ride with status: ${ride.status}`);
        }

        ride.status = RideStatus.CANCELLED;
        await this.ridesRepository.save(ride);

        const tokens: string[] = [];
        if (ride.driver?.expoPushTokens) tokens.push(...ride.driver.expoPushTokens);
        if (ride.passenger?.expoPushTokens) tokens.push(...ride.passenger.expoPushTokens);
        if (tokens.length) {
            await this.pushService.sendToExpoTokens(tokens, 'Ride Cancelled by Admin', reason || 'Your ride was cancelled by admin.');
        }

        return { success: true, rideId, status: RideStatus.CANCELLED };
    }

    // ─── Payments & Refunds ───────────────────────────────────────────────────

    async getPayments(actorUserId: string, filters?: { status?: string; page?: number }) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const page = Math.max(1, filters?.page || 1);
        const take = 50;
        const skip = (page - 1) * take;

        const query = this.ridesRepository.createQueryBuilder('ride')
            .leftJoinAndSelect('ride.driver', 'driver')
            .leftJoinAndSelect('ride.passenger', 'passenger')
            .where('ride.paymentStatus IS NOT NULL')
            .orderBy('ride.updatedAt', 'DESC')
            .take(take)
            .skip(skip);

        if (filters?.status) {
            query.andWhere('ride.paymentStatus = :status', { status: filters.status });
        }

        const [rides, total] = await query.getManyAndCount();

        return {
            total,
            page,
            data: rides.map((r) => ({
                rideId: r.id,
                paymentStatus: r.paymentStatus,
                paymentMethod: r.paymentMethod,
                amount: Number(r.tripFare || 0),
                driverEarnings: Number(r.driverNetEarnings || r.driverEarnings || 0),
                platformCut: Number(r.platformCutAmount || r.platformCut || 0),
                platformCutPercent: Number(r.platformCutPercent || 0),
                insuranceReserveAmount: Number(r.insuranceReserveAmount || 0),
                insuranceReservePercent: Number(r.insuranceReservePercent || 0),
                paystackReference: r.paystackReference || null,
                paymentReference: r.paymentReference || null,
                payoutStatus: r.payoutStatus || null,
                refundReference: r.refundReference || null,
                refundReason: r.refundReason || null,
                driver: r.driver ? `${r.driver.firstName || ''} ${r.driver.lastName || ''}`.trim() || r.driver.email : null,
                passenger: r.passenger ? `${r.passenger.firstName || ''} ${r.passenger.lastName || ''}`.trim() || r.passenger.email : null,
                origin: (r.origin as any)?.address || r.origin,
                destination: (r.destination as any)?.address || r.destination,
                date: r.updatedAt,
            })),
        };
    }

    async refundRide(actorUserId: string, rideId: string, reason: string, amountNaira?: number) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const result = await this.paymentsService.initiateRefund(rideId, reason, amountNaira);

        // Notify passenger
        const ride = await this.ridesRepository.findOne({ where: { id: rideId }, relations: ['passenger'] });
        if (ride?.passenger?.expoPushTokens?.length) {
            await this.pushService.sendToExpoTokens(
                ride.passenger.expoPushTokens,
                'Refund Processed',
                `Your payment of ₦${result.amount.toLocaleString()} has been refunded. ${reason}`,
                { type: 'refund', rideId },
            );
        }
        if (ride?.passenger?.email) {
            await this.mailerService.sendEmail(
                [ride.passenger.email],
                'Your edrive refund has been processed',
                `<p>Hi ${ride.passenger.firstName || 'there'},</p><p>Your payment of <strong>₦${result.amount.toLocaleString()}</strong> for ride <strong>${(ride.origin as any)?.address || ''} → ${(ride.destination as any)?.address || ''}</strong> has been refunded.</p><p><strong>Reason:</strong> ${reason}</p><p>Funds should appear in your account within 3–5 business days depending on your bank.</p>`,
                `Your refund of ₦${result.amount.toLocaleString()} has been processed.`,
                { from: 'support@edriveapp.com' },
            );
        }

        return { success: true, ...result };
    }

    async verifyTransferPayment(actorUserId: string, bookingId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const booking = await this.bookingsRepository.findOne({
            where: { id: bookingId },
            relations: ['ride', 'ride.driver', 'passenger'],
        });
        if (!booking) throw new NotFoundException('Booking not found');
        if (booking.paymentMethod !== 'transfer') {
            throw new BadRequestException('This booking is not a transfer payment');
        }
        if (booking.paymentStatus === 'paid') {
            return { success: true, message: 'Already verified' };
        }
        if (booking.status === BookingStatus.CANCELLED) {
            throw new BadRequestException('Cannot verify a cancelled booking');
        }

        // Mark the booking as paid
        booking.paymentStatus = 'paid';
        await this.bookingsRepository.save(booking);

        // Also update the ride-level payment details
        const ride = booking.ride;
        if (ride) {
            const amount = Number(booking.fareCharged || ride.fare || ride.tripFare || 0);
            const estimatedDurationMinutes = Number(ride.estimatedDurationMinutes || 0);
            const split = await this.paymentsService.calculatePaymentSplit(amount, estimatedDurationMinutes);

            ride.paymentStatus = 'paid';
            ride.paymentMethod = ride.paymentMethod || 'transfer';
            ride.payoutStatus = 'earnings_allocated';
            ride.platformCut = split.platformCutAmount;
            ride.platformCutPercent = split.platformCutPercent;
            ride.platformCutAmount = split.platformCutAmount;
            ride.insuranceReservePercent = split.insuranceReservePercent;
            ride.insuranceReserveAmount = split.insuranceReserveAmount;
            ride.driverNetEarnings = split.driverNetEarnings;
            ride.driverEarnings = split.driverNetEarnings;
            await this.ridesRepository.save(ride);
        }

        // Notify passenger
        const passenger = booking.passenger;
        if (passenger?.expoPushTokens?.length) {
            await this.pushService.sendToExpoTokens(
                passenger.expoPushTokens,
                'Transfer Verified',
                'Your transfer payment has been confirmed. Your seat is fully paid.',
                { type: 'transfer_verified', bookingId },
            );
        }
        if (passenger?.email) {
            await this.mailerService.sendEmail(
                [passenger.email],
                'Your edrive transfer payment has been confirmed',
                `<p>Hi ${passenger.firstName || 'there'},</p><p>Your transfer payment of <strong>\u20A6${Number(booking.fareCharged || 0).toLocaleString()}</strong> has been verified and confirmed.</p><p>Thank you for riding with edrive!</p>`,
                `Your transfer payment has been confirmed.`,
                { from: 'support@edriveapp.com' },
            );
        }

        return { success: true, bookingId, paymentStatus: 'paid' };
    }

    // ─── User Detail ──────────────────────────────────────────────────────────

    async getUserDetail(actorUserId: string, userId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['driverProfile'],
        });
        if (!user) throw new NotFoundException('User not found');

        const rideQuery = user.role === UserRole.DRIVER
            ? { driverId: userId }
            : { passengerId: userId };

        const rides = await this.ridesRepository.find({
            where: rideQuery,
            order: { createdAt: 'DESC' },
            take: 50,
            relations: ['driver', 'passenger'],
        });

        const ratings = await this.ratingsRepository.find({
            where: { rateeId: userId },
            order: { createdAt: 'DESC' },
            take: 20,
        });

        const warnings = user.role === UserRole.DRIVER
            ? await this.warningsRepository.find({ where: { driverId: userId }, order: { createdAt: 'DESC' } })
            : [];

        const tickets = await this.ticketsRepository.find({
            where: { createdByUserId: userId },
            order: { createdAt: 'DESC' },
            take: 20,
        });

        const completedRides = rides.filter((r) => r.status === RideStatus.COMPLETED);
        const totalSpend = completedRides.reduce((s, r) => s + Number(r.tripFare || 0), 0);

        return {
            user: this.toSafeUser(user),
            stats: {
                totalRides: rides.length,
                completedRides: completedRides.length,
                cancelledRides: rides.filter((r) => r.status === RideStatus.CANCELLED).length,
                totalSpend: Number(totalSpend.toFixed(2)),
                averageRating: user.rating,
                walletBalance: Number(user.balance || 0),
                pendingRemittance: Number(user.pendingRemittance || 0),
            },
            rides: rides.map((r) => ({
                id: r.id,
                status: r.status,
                paymentStatus: r.paymentStatus,
                fare: Number(r.tripFare || 0),
                origin: (r.origin as any)?.address || r.origin,
                destination: (r.destination as any)?.address || r.destination,
                date: r.createdAt,
            })),
            ratings: ratings.map((rv) => ({ value: rv.value, comment: rv.comment, date: rv.createdAt })),
            warnings,
            tickets: tickets.map((t) => ({ id: t.id, subject: t.subject, status: t.status, date: t.createdAt })),
        };
    }

    async adjustWallet(actorUserId: string, userId: string, amount: number, type: 'credit' | 'debit', reason: string) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);

        if (!amount || amount <= 0) throw new BadRequestException('Amount must be positive');
        if (amount > 1_000_000) throw new BadRequestException('Single adjustment cannot exceed ₦1,000,000');
        if (!reason?.trim()) throw new BadRequestException('A reason is required for wallet adjustments');

        const { updatedUser, balanceChange } = await this.usersRepository.manager.transaction(async (em) => {
            const user = await em.findOne(User, { 
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user) throw new NotFoundException('User not found');

            if (type === 'credit') {
                user.balance = Number(user.balance || 0) + amount;
                const txn = em.create(WalletTransaction, {
                    userId,
                    type: 'wallet_adjustment_credit',
                    amount,
                    direction: 'credit',
                    description: reason,
                });
                await em.save(txn);
            } else {
                if (Number(user.balance || 0) < amount) throw new BadRequestException('Insufficient wallet balance');
                user.balance = Number(user.balance || 0) - amount;
                const txn = em.create(WalletTransaction, {
                    userId,
                    type: 'wallet_adjustment_debit',
                    amount,
                    direction: 'debit',
                    description: reason,
                });
                await em.save(txn);
            }

            await em.save(user);
            return { updatedUser: user, balanceChange: amount * (type === 'credit' ? 1 : -1) };
        });

        if (updatedUser?.expoPushTokens?.length) {
            await this.pushService.sendToExpoTokens(
                updatedUser.expoPushTokens,
                type === 'credit' ? 'Wallet Credited' : 'Wallet Debited',
                `₦${amount.toLocaleString()} has been ${type === 'credit' ? 'added to' : 'removed from'} your wallet. ${reason}`,
                { type: 'wallet_adjustment', amount, reason }
            );
        }

        if (updatedUser?.email && this.isValidEmail(updatedUser.email)) {
            await this.mailerService.sendEmail(
                [updatedUser.email],
                `edrive Wallet ${type === 'credit' ? 'Credited' : 'Debited'}`,
                `<p>Hello ${updatedUser.firstName || 'User'},</p><p>Your edrive wallet has been <strong>${type === 'credit' ? 'credited' : 'debited'}</strong> by ₦${amount.toLocaleString()}.</p><p><strong>Reason:</strong> ${reason}</p><p>Your new balance is ₦${Number(updatedUser.balance || 0).toLocaleString()}.</p>`,
                `Your wallet was ${type}ed by ₦${amount}. Reason: ${reason}`,
                { from: 'support@edriveapp.com' }
            );
        }

        return { success: true, newBalance: Number(updatedUser?.balance || 0), type, amount, reason };
    }

    async clearDriverRemittance(actorUserId: string, userId: string, reason: string) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);

        const { clearedAmount, updatedUser } = await this.usersRepository.manager.transaction(async (em) => {
            const user = await em.findOne(User, { 
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user) throw new NotFoundException('User not found');

            const cleared = Number(user.pendingRemittance || 0);
            if (cleared > 0) {
                user.pendingRemittance = 0;
                const txn = em.create(WalletTransaction, {
                    userId,
                    type: 'remittance_payment',
                    amount: cleared,
                    direction: 'credit',
                    description: `Remittance cleared by admin: ${reason}`,
                });
                await em.save(txn);
            }
            await em.save(user);
            return { clearedAmount: cleared, updatedUser: user };
        });
        
        if (clearedAmount > 0 && updatedUser) {
            if (updatedUser.expoPushTokens?.length) {
                await this.pushService.sendToExpoTokens(
                    updatedUser.expoPushTokens,
                    'Remittance Debt Cleared',
                    `Your remittance debt of ₦${clearedAmount.toLocaleString()} has been cleared by admin.`,
                    { type: 'remittance_cleared', amount: clearedAmount }
                );
            }
            if (updatedUser.email && this.isValidEmail(updatedUser.email)) {
                await this.mailerService.sendEmail(
                    [updatedUser.email],
                    'edrive Remittance Cleared',
                    `<p>Hello ${updatedUser.firstName || 'Driver'},</p><p>Your remittance debt of <strong>₦${clearedAmount.toLocaleString()}</strong> has been cleared by an administrator.</p><p><strong>Reason:</strong> ${reason}</p><p>Your current pending remittance is now ₦0.</p>`,
                    `Your remittance debt of ₦${clearedAmount} was cleared by admin.`,
                    { from: 'support@edriveapp.com' }
                );
            }
        }
        
        return { success: true, clearedAmount, reason };
    }

    async addCommissionDebt(actorUserId: string, userId: string, amount: number, reason: string) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);

        if (!amount || amount <= 0) throw new BadRequestException('Amount must be positive');
        if (!reason?.trim()) throw new BadRequestException('A reason is required to add debt');

        const { newPendingRemittance, updatedUser } = await this.usersRepository.manager.transaction(async (em) => {
            const user = await em.findOne(User, { 
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user) throw new NotFoundException('User not found');

            user.pendingRemittance = Number(user.pendingRemittance || 0) + amount;
            
            const txn = em.create(WalletTransaction, {
                userId,
                type: 'remittance_due',
                amount,
                direction: 'debit',
                description: `Debt added by admin: ${reason}`,
            });
            await em.save(txn);

            const updated = await em.findOne(User, { where: { id: userId } });
            return { newPendingRemittance: Number(updated?.pendingRemittance || 0), updatedUser: updated };
        });

        if (updatedUser) {
            if (updatedUser.expoPushTokens?.length) {
                await this.pushService.sendToExpoTokens(
                    updatedUser.expoPushTokens,
                    'Commission Debt Added',
                    `A commission debt of ₦${amount.toLocaleString()} has been added to your account.`,
                    { type: 'debt_added', amount }
                );
            }
            if (updatedUser.email && this.isValidEmail(updatedUser.email)) {
                await this.mailerService.sendEmail(
                    [updatedUser.email],
                    'edrive Commission Debt Update',
                    `<p>Hello ${updatedUser.firstName || 'Driver'},</p><p>A commission debt of <strong>₦${amount.toLocaleString()}</strong> has been added to your account.</p><p><strong>Reason:</strong> ${reason}</p><p>Your new pending remittance balance is ₦${newPendingRemittance.toLocaleString()}.</p>`,
                    `A debt of ₦${amount} was added. Reason: ${reason}`,
                    { from: 'support@edriveapp.com' }
                );
            }
        }

        return { success: true, newPendingRemittance, amount, reason };
    }


    // ─── Support Ticket Management ────────────────────────────────────────────

    async getAllSupportTickets(actorUserId: string, status?: SupportTicketStatus) {
        const actor = await this.getActor(actorUserId);
        this.assertAdmin(actor);
        if (![AdminScope.SUPER_ADMIN, AdminScope.SUPPORT, AdminScope.OPERATIONS].includes(actor.adminScope)) {
            throw new ForbiddenException('Support access required');
        }

        const where: any = {};
        if (status) where.status = status;

        const tickets = await this.ticketsRepository.find({
            where,
            order: { updatedAt: 'DESC' },
            take: 200,
        });

        // Attach creator info
        const userIds = [...new Set(tickets.map((t) => t.createdByUserId))];
        const users = userIds.length
            ? await this.usersRepository.find({ where: userIds.map((id) => ({ id })) })
            : [];
        const userMap = new Map(users.map((u) => [u.id, u]));

        return tickets.map((t) => {
            const creator = userMap.get(t.createdByUserId);
            return {
                ...t,
                createdBy: creator ? { id: creator.id, email: creator.email, name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim(), role: creator.role } : null,
            };
        });
    }

    async getSupportTicketDetail(actorUserId: string, ticketId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertSupportAdmin(actor);

        const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        const messages = await this.supportMessagesRepository.find({
            where: { ticketId },
            order: { createdAt: 'ASC' },
        });

        const creator = await this.usersRepository.findOne({ where: { id: ticket.createdByUserId } });

        return {
            ...ticket,
            messages,
            createdBy: creator ? this.toSafeUser(creator) : null,
        };
    }

    async replySupportTicket(actorUserId: string, ticketId: string, text: string) {
        const actor = await this.getActor(actorUserId);
        this.assertSupportAdmin(actor);

        const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        const message = this.supportMessagesRepository.create({
            ticketId,
            senderId: actor.id,
            senderRole: actor.role,
            text,
        });
        await this.supportMessagesRepository.save(message);
        await this.ticketsRepository.update(ticketId, {
            updatedAt: new Date(),
            status: ticket.status === SupportTicketStatus.RESOLVED ? SupportTicketStatus.IN_PROGRESS : ticket.status,
        });

        // Notify the ticket creator with the agent's name
        const agentName = `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || 'Support Agent';
        const creator = await this.usersRepository.findOne({ where: { id: ticket.createdByUserId } });
        if (creator?.expoPushTokens?.length) {
            await this.pushService.sendToExpoTokens(
                creator.expoPushTokens,
                'Support Ticket Update',
                `${agentName} replied to your ticket: ${ticket.subject}`,
                { type: 'support', ticketId },
            );
        }

        return { success: true, agentName };
    }

    async updateSupportTicketStatus(actorUserId: string, ticketId: string, status: SupportTicketStatus) {
        const actor = await this.getActor(actorUserId);
        this.assertSupportAdmin(actor);

        const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        await this.ticketsRepository.update(ticketId, { status });
        return { success: true, ticketId, status };
    }

    async assignSupportTicket(actorUserId: string, ticketId: string, assignToUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertSupportAdmin(actor);

        const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        await this.ticketsRepository.update(ticketId, {
            assignedToUserId: assignToUserId,
            status: SupportTicketStatus.IN_PROGRESS,
        });
        return { success: true };
    }

    // ─── Direct Notifications ─────────────────────────────────────────────────

    async sendDirectNotification(actorUserId: string, userId: string, title: string, body: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        if (!user.expoPushTokens?.length) {
            return { success: false, reason: 'User has no registered push tokens' };
        }

        await this.pushService.sendToExpoTokens(user.expoPushTokens, title, body, { type: 'admin_direct' });
        return { success: true };
    }

    // ─── Private Helpers ───────────────────────────────────────────────────────

    private toSafeUser(user: User) {
        const { passwordHash, ...rest } = user as User & { passwordHash?: string };
        return { ...rest, passwordHash: undefined };
    }

    private buildRevenueSeries(rides: Ride[]) {
        const months: string[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i -= 1) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        const buckets = new Map<string, { gmv: number; revenue: number }>();
        months.forEach((key) => buckets.set(key, { gmv: 0, revenue: 0 }));

        rides.forEach((ride) => {
            const dt = new Date(ride.createdAt);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            if (!buckets.has(key)) return;
            const current = buckets.get(key)!;
            current.gmv += Number(ride.tripFare || 0);
            current.revenue += Number(ride.platformCut || 0);
            buckets.set(key, current);
        });

        return months.map((key) => {
            const [year, month] = key.split('-');
            const labelDate = new Date(Number(year), Number(month) - 1, 1);
            const label = labelDate.toLocaleString('en-US', { month: 'short' });
            const values = buckets.get(key) || { gmv: 0, revenue: 0 };
            return {
                name: label,
                gmv: Number(values.gmv.toFixed(2)),
                revenue: Number(values.revenue.toFixed(2)),
            };
        });
    }

    private buildAreaDirectionVolumes(rides: Ride[], direction: 'origin' | 'destination', limit = 8) {
        const bucket = new Map<string, number>();
        rides.forEach((ride) => {
            const source = direction === 'origin'
                ? ((ride.origin as any)?.address ?? ride.origin)
                : ((ride.destination as any)?.address ?? ride.destination);
            const area = extractAreaName(source);
            if (!area || area === 'Unknown') return;
            bucket.set(area, (bucket.get(area) || 0) + 1);
        });

        return Array.from(bucket.entries())
            .map(([name, ridesCount]) => ({ name, rides: ridesCount }))
            .sort((a, b) => b.rides - a.rides)
            .slice(0, limit);
    }

    private async getOperationalActiveUsers() {
        const now = Date.now();
        const presenceWindowMinutes = 15;
        const activityWindowHours = 24;
        const presenceCutoff = new Date(now - presenceWindowMinutes * 60 * 1000);
        const activityCutoff = new Date(now - activityWindowHours * 60 * 60 * 1000);

        const presenceRows = await this.usersRepository
            .createQueryBuilder('user')
            .select('user.id', 'userId')
            .where('user.role IN (:...roles)', { roles: [UserRole.PASSENGER, UserRole.DRIVER] })
            .andWhere('user.updatedAt >= :presenceCutoff', { presenceCutoff })
            .getRawMany<{ userId: string }>();

        const availableDriverRows = await this.ridesRepository
            .createQueryBuilder('ride')
            .select('ride.driverId', 'userId')
            .distinct(true)
            .where('ride.driverId IS NOT NULL')
            .andWhere('ride.status IN (:...statuses)', {
                statuses: [RideStatus.SEARCHING, RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS],
            })
            .getRawMany<{ userId: string }>();

        const activityDriverRows = await this.ridesRepository
            .createQueryBuilder('ride')
            .select('ride.driverId', 'userId')
            .distinct(true)
            .where('ride.updatedAt >= :activityCutoff', { activityCutoff })
            .andWhere('ride.driverId IS NOT NULL')
            .getRawMany<{ userId: string }>();

        const activityPassengerRows = await this.ridesRepository
            .createQueryBuilder('ride')
            .select('ride.passengerId', 'userId')
            .distinct(true)
            .where('ride.updatedAt >= :activityCutoff', { activityCutoff })
            .andWhere('ride.passengerId IS NOT NULL')
            .getRawMany<{ userId: string }>();

        const presenceIds = new Set(presenceRows.map((row) => row.userId).filter(Boolean));
        const availableDriverIds = new Set(availableDriverRows.map((row) => row.userId).filter(Boolean));
        const activityIds = new Set<string>();
        activityDriverRows.forEach((row) => row.userId && activityIds.add(row.userId));
        activityPassengerRows.forEach((row) => row.userId && activityIds.add(row.userId));

        const operationalActiveIds = new Set<string>([...presenceIds, ...availableDriverIds, ...activityIds]);

        return {
            total: operationalActiveIds.size,
            breakdown: {
                realtimePresence: presenceIds.size,
                availableDrivers: availableDriverIds.size,
                businessActivity: activityIds.size,
                presenceWindowMinutes,
                activityWindowHours,
            },
        };
    }

    async getAdminEmailsByScopes(scopes: AdminScope[]) {
        const admins = await this.usersRepository.find({
            where: { role: UserRole.ADMIN },
        });
        return admins
            .filter((admin) => scopes.includes(admin.adminScope))
            .map((admin) => admin.email)
            .filter(Boolean);
    }
}
