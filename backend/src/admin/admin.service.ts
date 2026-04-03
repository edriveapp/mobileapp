import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { MailerService } from '../common/mailer.service';
import { PushNotificationsService } from '../common/push-notifications.service';
import { AdminScope, User, UserRole, VerificationStatus } from '../users/user.entity';
import { Ride, RideStatus } from '../rides/ride.entity';
import { Rating } from '../ratings/rating.entity';
import { buildTrendingAreas, extractAreaName } from '../rides/trending-areas.util';
import { DriverWarning, WarningLevel } from './driver-warning.entity';
import { CampaignRepeat, CampaignStatus, NotificationCampaign } from './notification-campaign.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Ride)
        private ridesRepository: Repository<Ride>,
        @InjectRepository(Rating)
        private ratingsRepository: Repository<Rating>,
        @InjectRepository(DriverWarning)
        private warningsRepository: Repository<DriverWarning>,
        @InjectRepository(NotificationCampaign)
        private campaignsRepository: Repository<NotificationCampaign>,
        private readonly mailerService: MailerService,
        private readonly pushService: PushNotificationsService,
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

    private assertOperationsAdmin(actor: User) {
        this.assertAdmin(actor);
        if (![AdminScope.SUPER_ADMIN, AdminScope.OPERATIONS].includes(actor.adminScope)) {
            throw new ForbiddenException('Operations admin access required');
        }
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
        };
    }

    async updatePlatformSettings(actorUserId: string, settings: { platformCutPercent: number }) {
        const actor = await this.getActor(actorUserId);
        this.assertSuperAdmin(actor);
        if (settings.platformCutPercent < 0 || settings.platformCutPercent > 100) {
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
            platformCutPercent: settings.platformCutPercent,
        };
        await this.usersRepository.save(settingsUser);
        return { platformCutPercent: settings.platformCutPercent };
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
            .reduce((sum, r) => sum + Number(r.tripFare || 0) - Number(r.platformCut || 0), 0);

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
            );
        }

        // Email the driver
        await this.mailerService.sendEmail(
            [driver.email],
            `eDrive Account Warning – ${level.toUpperCase()}`,
            `<p>Dear ${driver.firstName || 'Driver'},</p><p>You have received a <strong>${level}</strong> warning from the eDrive team.</p><p><strong>Reason:</strong> ${reason}</p><p>Please review our community guidelines and ensure compliance to avoid further action.</p>`,
            `You have received a ${level} warning: ${reason}`,
        );

        return { success: true, warning };
    }

    async toggleDriverRestriction(actorUserId: string, driverId: string, restrict: boolean) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);

        const driver = await this.usersRepository.findOne({ where: { id: driverId } });
        if (!driver) throw new NotFoundException('Driver not found');

        driver.isRestricted = restrict;
        await this.usersRepository.save(driver);

        // Notify driver
        if (driver.expoPushTokens?.length) {
            await this.pushService.sendToExpoTokens(
                driver.expoPushTokens,
                restrict ? '🔒 Account Restricted' : '✅ Account Reinstated',
                restrict
                    ? 'Your driver account has been restricted. Please contact support.'
                    : 'Your driver account has been reinstated. You can now accept rides.',
            );
        }

        // Notify admin team
        const adminEmails = await this.getAdminEmailsByScopes([AdminScope.SUPER_ADMIN, AdminScope.OPERATIONS]);
        await this.mailerService.sendEmail(
            adminEmails,
            `Driver account ${restrict ? 'restricted' : 'reinstated'}: ${driver.email}`,
            `<p>Driver <strong>${driver.email}</strong> has been <strong>${restrict ? 'restricted' : 'reinstated'}</strong> by admin.</p>`,
            `Driver ${driver.email} has been ${restrict ? 'restricted' : 'reinstated'}.`,
        );

        return { success: true, isRestricted: driver.isRestricted };
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

        const verificationTeam = await this.getAdminEmailsByScopes([AdminScope.SUPER_ADMIN, AdminScope.VERIFICATION, AdminScope.OPERATIONS]);
        await this.mailerService.sendEmail(
            verificationTeam,
            `Driver verification ${status}: ${saved.email}`,
            `<p>Driver <strong>${saved.email}</strong> verification status changed to <strong>${status}</strong>.</p>`,
            `Driver ${saved.email} verification status changed to ${status}.`,
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
        const users = await this.usersRepository.find({
            where: { role: UserRole.PASSENGER },
        });
        const drivers = await this.usersRepository.find({
            where: { role: UserRole.DRIVER },
        });

        const allTokens: string[] = [];
        [...users, ...drivers].forEach((u) => {
            if (Array.isArray(u.expoPushTokens)) {
                allTokens.push(...u.expoPushTokens);
            }
        });

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
                passwordHash: payload.password,
                firstName: payload.firstName || existing.firstName,
                lastName: payload.lastName || existing.lastName,
            });
            const refreshed = await this.usersRepository.findOne({ where: { id: existing.id } });
            if (!refreshed) throw new NotFoundException('User not found');
            return this.toSafeUser(refreshed);
        }

        const created = this.usersRepository.create({
            email: payload.email.trim().toLowerCase(),
            passwordHash: payload.password,
            firstName: payload.firstName || '',
            lastName: payload.lastName || '',
            role: UserRole.ADMIN,
            adminScope: payload.adminScope,
        });
        const saved = await this.usersRepository.save(created);

        await this.mailerService.sendEmail(
            [saved.email],
            'Your eDrive admin account is ready',
            `<p>Hello ${saved.firstName || 'Admin'}, your admin account has been created with <strong>${payload.adminScope}</strong> scope.</p>`,
            `Your admin account has been created with ${payload.adminScope} scope.`,
        );

        return this.toSafeUser(saved);
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

    private async getAdminEmailsByScopes(scopes: AdminScope[]) {
        const admins = await this.usersRepository.find({
            where: { role: UserRole.ADMIN },
        });
        return admins
            .filter((admin) => scopes.includes(admin.adminScope))
            .map((admin) => admin.email)
            .filter(Boolean);
    }
}
