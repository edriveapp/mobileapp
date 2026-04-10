import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { MailerService } from '../common/mailer.service';
import { RedisService } from '../common/redis.service';
import { DriverProfile } from './driver-profile.entity';
import { SavedPlace } from './saved-place.entity';
import { AdminScope, User, UserRole, VerificationStatus } from './user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(DriverProfile)
        private driverProfileRepository: Repository<DriverProfile>,
        @InjectRepository(SavedPlace)
        private savedPlaceRepository: Repository<SavedPlace>,
        private readonly mailerService: MailerService,
        private readonly redisService: RedisService,
    ) { }

    async findOneByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { email } });
    }

    async findOneById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id } });
    }

    async create(userData: Partial<User>): Promise<User> {
        const user = this.usersRepository.create(userData);
        return this.usersRepository.save(user);
    }

    // --- Preferences ---

    async updatePreferences(userId: string, prefs: Partial<User['preferences']>): Promise<User> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');
        user.preferences = { ...user.preferences, ...prefs };
        return this.usersRepository.save(user);
    }

    async updateVerificationStatus(userId: string, status: 'unverified' | 'pending' | 'approved' | 'rejected'): Promise<User> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');
        await this.usersRepository.update(userId, { verificationStatus: status as any });
        return this.findOneById(userId); // Return the updated user
    }

    async getWallet(userId: string) {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // We could fetch actual transactions from a Transaction entity if we had one.
        // For now, let's derive some "credits" from completed rides.
        return {
            balance: Number(user.balance || 0),
            pendingRemittance: Number(user.pendingRemittance || 0),
            commissionDue: Number(user.pendingRemittance || 0), // Same thing in this context
            lastCommissionPaymentDate: null,
            transactions: [], // To be populated if needed
        };
    }

    async fundWallet(userId: string, amount: number) {
        if (!amount || amount <= 0) {
            throw new BadRequestException('Invalid amount');
        }
        await this.usersRepository.increment({ id: userId }, 'balance', amount);
        return this.getWallet(userId);
    }

    async payCommission(userId: string, amount?: number) {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        const due = Number(user.pendingRemittance || 0);
        const payAmount = amount && amount > 0 ? Math.min(amount, due) : due;

        if (payAmount <= 0) return this.getWallet(userId);
        if (Number(user.balance || 0) < payAmount) {
            throw new BadRequestException('Insufficient wallet balance');
        }

        await this.usersRepository.decrement({ id: userId }, 'balance', payAmount);
        await this.usersRepository.decrement({ id: userId }, 'pendingRemittance', payAmount);
        return this.getWallet(userId);
    }

    async addCommissionDebt(userId: string, amount: number) {
        if (!amount || amount <= 0) {
            throw new BadRequestException('Invalid amount');
        }
        await this.usersRepository.increment({ id: userId }, 'pendingRemittance', amount);
        return this.getWallet(userId);
    }

    async updateProfile(userId: string, profile: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }): Promise<User> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        const updatePayload: Partial<User> = {};

        if (typeof profile.firstName === 'string') {
            updatePayload.firstName = profile.firstName.trim();
        }
        if (typeof profile.lastName === 'string') {
            updatePayload.lastName = profile.lastName.trim();
        }
        if (typeof profile.phone === 'string') {
            updatePayload.phone = profile.phone.trim();
        }
        if (typeof profile.avatarUrl === 'string') {
            updatePayload.avatarUrl = profile.avatarUrl.trim();
        }

        // Avoid TypeORM "update values are not defined" when nothing was provided.
        if (Object.keys(updatePayload).length > 0) {
            await this.usersRepository.update(userId, updatePayload);
        }

        const updated = await this.findOneById(userId);
        if (!updated) throw new NotFoundException('User not found');
        return updated;
    }

    async updatePassword(userId: string, newPassword: string): Promise<void> {
        const hashed = await bcrypt.hash(newPassword, 12);
        await this.usersRepository.update(userId, { passwordHash: hashed });
    }

    async setAdmin(userId: string, role: UserRole, scope: AdminScope): Promise<void> {
        await this.usersRepository.update(userId, { role, adminScope: scope });
    }

    async registerExpoPushToken(userId: string, token: string): Promise<User> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        const nextTokens = Array.from(new Set([...(user.expoPushTokens || []), token]));
        user.expoPushTokens = nextTokens;
        return this.usersRepository.save(user);
    }

    async getPushTokensForRole(role: User['role']): Promise<string[]> {
        const users = await this.usersRepository.find({
            where: { role },
        });

        return users
            .filter((user) => user.preferences?.pushNotifications !== false)
            .flatMap((user) => user.expoPushTokens || []);
    }

    async getPushTokensForUser(userId: string): Promise<string[]> {
        const user = await this.findOneById(userId);
        if (!user || user.preferences?.pushNotifications === false) return [];
        return user.expoPushTokens || [];
    }

    async getPushTokensForUsers(userIds: string[]): Promise<string[]> {
        if (!userIds.length) return [];
        const users = await this.usersRepository.findByIds(userIds);
        return users
            .filter((user) => user.preferences?.pushNotifications !== false)
            .flatMap((user) => user.expoPushTokens || []);
    }

    // --- Saved Places ---

    async getSavedPlaces(userId: string): Promise<SavedPlace[]> {
        return this.savedPlaceRepository.find({
            where: { userId },
            order: { createdAt: 'ASC' },
        });
    }

    async addSavedPlace(userId: string, data: Partial<SavedPlace>): Promise<SavedPlace> {
        const place = this.savedPlaceRepository.create({ ...data, userId });
        return this.savedPlaceRepository.save(place);
    }

    async deleteSavedPlace(userId: string, placeId: string): Promise<void> {
        const place = await this.savedPlaceRepository.findOne({
            where: { id: placeId, userId },
        });
        if (!place) throw new NotFoundException('Saved place not found');
        await this.savedPlaceRepository.remove(place);
    }

    // --- Driver Profile ---

    async getDriverProfile(userId: string): Promise<any> {
        // Fetch via User so we always have user data even if DriverProfile row is absent
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['driverProfile'],
        });
        if (!user) return null;

        const { passwordHash, expoPushTokens, driverProfile, ...safeUser } = user as any;
        const profile = driverProfile ?? null;

        if (!profile) {
            // No DriverProfile record yet — return a stub so the frontend never sees null
            return {
                id: null,
                user: safeUser,
                vehicleDetails: null,
                licenseDetails: null,
                onboardingMeta: null,
                isVerified: false,
                isOnline: false,
            };
        }

        // Strip PostGIS geometry field to avoid serialisation issues
        const { lastLocation, ...profileRest } = profile as any;
        return {
            ...profileRest,
            user: safeUser,
        };
    }

    async createDriverProfile(userId: string, details: any): Promise<DriverProfile> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        const userUpdatePayload: Partial<User> = {};
        if (user.role !== UserRole.DRIVER) {
            userUpdatePayload.role = UserRole.DRIVER;
        }
        if (user.verificationStatus !== VerificationStatus.PENDING) {
            userUpdatePayload.verificationStatus = VerificationStatus.PENDING;
        }
        if (Object.keys(userUpdatePayload).length > 0) {
            await this.usersRepository.update(userId, userUpdatePayload);
            if (userUpdatePayload.role) {
                user.role = userUpdatePayload.role;
            }
            if (userUpdatePayload.verificationStatus) {
                user.verificationStatus = userUpdatePayload.verificationStatus;
            }
        }

        const existing = await this.driverProfileRepository.findOne({
            where: { user: { id: userId } },
            relations: ['user'],
        });

        const nextVehicleDetails = details?.vehicleDetails;
        const nextLicenseDetails = details?.licenseDetails;
        const nextOnboardingMeta = details?.onboardingMeta;

        if (existing) {
            const updatePayload: Partial<DriverProfile> = {};

            if (nextVehicleDetails && JSON.stringify(existing.vehicleDetails || {}) !== JSON.stringify(nextVehicleDetails)) {
                updatePayload.vehicleDetails = nextVehicleDetails;
            }

            if (nextLicenseDetails && JSON.stringify(existing.licenseDetails || {}) !== JSON.stringify(nextLicenseDetails)) {
                updatePayload.licenseDetails = nextLicenseDetails;
            }
            if (nextOnboardingMeta && JSON.stringify(existing.onboardingMeta || {}) !== JSON.stringify(nextOnboardingMeta)) {
                updatePayload.onboardingMeta = nextOnboardingMeta;
            }

            if (Object.keys(updatePayload).length === 0) {
                return existing;
            }

            await this.driverProfileRepository.update(existing.id, updatePayload);

            const refreshed = await this.driverProfileRepository.findOne({
                where: { id: existing.id },
                relations: ['user'],
            });
            if (!refreshed) throw new NotFoundException('Driver profile not found after update');

            const recipients = await this.getVerificationNotificationEmails();
            await this.mailerService.sendEmail(
                recipients,
                `Driver verification submitted: ${user.email}`,
                `<p>Driver <strong>${user.email}</strong> submitted/updated onboarding details for verification.</p>`,
                `Driver ${user.email} submitted onboarding details.`,
            );

            return refreshed;
        }

        const profile = this.driverProfileRepository.create({
            user,
            vehicleDetails: nextVehicleDetails || null,
            licenseDetails: nextLicenseDetails || null,
            onboardingMeta: nextOnboardingMeta || null,
        } as Partial<DriverProfile>);

        const savedProfile = await this.driverProfileRepository.save(profile);

        const recipients = await this.getVerificationNotificationEmails();
        await this.mailerService.sendEmail(
            recipients,
            `New driver verification request: ${user.email}`,
            `<p>Driver <strong>${user.email}</strong> submitted onboarding details for verification.</p>`,
            `Driver ${user.email} submitted onboarding details.`,
        );

        return savedProfile;
    }

    async updateDriverLocation(driverId: string, lat: number, lon: number): Promise<void> {
        await this.redisService.setDriverLocation(driverId, lat, lon);

        await this.driverProfileRepository.update(
            { user: { id: driverId } },
            { lastLocation: { lat, lon } }
        );
    }

    async findNearbyDrivers(lat: number, lon: number, radiusKm: number = 5): Promise<DriverProfile[]> {
        const nearbyIds = await this.redisService.getNearbyDrivers(lat, lon, radiusKm);
        if (!nearbyIds || nearbyIds.length === 0) return [];

        return this.driverProfileRepository.find({
            where: {
                user: { id: In(nearbyIds) },
                isOnline: true,
            },
            relations: ['user'],
        });
    }

    private async getVerificationNotificationEmails() {
        const admins = await this.usersRepository.find({
            where: { role: UserRole.ADMIN },
        });

        return admins
            .filter((admin) => [AdminScope.SUPER_ADMIN, AdminScope.VERIFICATION, AdminScope.OPERATIONS].includes(admin.adminScope))
            .map((admin) => admin.email)
            .filter(Boolean);
    }
}
