import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '../common/mailer.service';
import { AdminScope, User, UserRole, VerificationStatus } from '../users/user.entity';
import { Ride, RideStatus } from '../rides/ride.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Ride)
        private ridesRepository: Repository<Ride>,
        private readonly mailerService: MailerService,
    ) {}

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

    async getStats(actorUserId: string) {
        const actor = await this.getActor(actorUserId);
        this.assertOperationsAdmin(actor);
        const totalUsers = await this.usersRepository.count();
        const rides = await this.ridesRepository.find({ where: { status: RideStatus.COMPLETED } });
        
        const gmv = rides.reduce((sum, r) => sum + Number(r.tripFare || 0), 0);
        const platformRevenue = rides.reduce((sum, r) => sum + Number(r.platformCut || 0), 0);
        
        return {
            gmv,
            arr: platformRevenue * 12, // Simple projection
            totalRides: await this.ridesRepository.count(),
            activeUsers: totalUsers,
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

        const revenueSeries = this.buildRevenueSeries(completedRides);
        const cityVolumes = this.buildCityVolumes(completedRides);

        return {
            stats,
            revenueSeries,
            cityVolumes,
            generatedAt: new Date().toISOString(),
        };
    }

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

    async updateUserVerificationStatus(actorUserId: string, userId: string, status: VerificationStatus): Promise<User> {
        const actor = await this.getActor(actorUserId);
        this.assertVerificationAdmin(actor);
        const user = await this.usersRepository.findOne({ 
            where: { id: userId },
            relations: ['driverProfile']
        });
        if (!user) throw new NotFoundException('User not found');
        
        user.verificationStatus = status;
        // If approved, also update the driver profile's verified flag
        if (status === VerificationStatus.APPROVED && user.driverProfile) {
            user.driverProfile.isVerified = true;
            await this.usersRepository.manager.save(user.driverProfile);
        }
        
        const saved = await this.usersRepository.save(user);

        const verificationTeam = await this.getAdminEmailsByScopes([AdminScope.SUPER_ADMIN, AdminScope.VERIFICATION, AdminScope.OPERATIONS]);
        await this.mailerService.sendEmail(
            verificationTeam,
            `Driver verification ${status}: ${saved.email}`,
            `<p>Driver <strong>${saved.email}</strong> verification status changed to <strong>${status}</strong>.</p>`,
            `Driver ${saved.email} verification status changed to ${status}.`,
        );

        return this.toSafeUser(saved);
    }

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

    private toSafeUser(user: User) {
        const { passwordHash, ...rest } = user as User & { passwordHash?: string };
        return {
            ...rest,
            passwordHash: undefined,
        };
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

    private buildCityVolumes(rides: Ride[]) {
        const counts = new Map<string, number>();
        rides.forEach((ride) => {
            const city = this.extractCityName((ride.destination as any)?.address ?? ride.destination);
            const prev = counts.get(city) || 0;
            counts.set(city, prev + 1);
        });

        return Array.from(counts.entries())
            .map(([name, value]) => ({ name, rides: value }))
            .sort((a, b) => b.rides - a.rides)
            .slice(0, 8);
    }

    private extractCityName(input: any) {
        if (!input) return 'Unknown';
        if (typeof input === 'string') {
            const first = input.split(',').map((s) => s.trim()).filter(Boolean)[0];
            return first || 'Unknown';
        }
        if (typeof input === 'object' && typeof input.address === 'string') {
            return this.extractCityName(input.address);
        }
        return 'Unknown';
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
