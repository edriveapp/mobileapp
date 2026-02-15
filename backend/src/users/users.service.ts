import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Point } from 'geojson';
import { Repository } from 'typeorm';
import { DriverProfile } from './driver-profile.entity';
import { SavedPlace } from './saved-place.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(DriverProfile)
        private driverProfileRepository: Repository<DriverProfile>,
        @InjectRepository(SavedPlace)
        private savedPlaceRepository: Repository<SavedPlace>,
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

    async getDriverProfile(userId: string): Promise<DriverProfile | null> {
        return this.driverProfileRepository.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    }

    async createDriverProfile(user: User, details: any): Promise<DriverProfile> {
        const profile = this.driverProfileRepository.create({
            user,
            ...details
        } as Partial<DriverProfile>);

        return this.driverProfileRepository.save(profile);
    }

    async updateDriverLocation(driverId: string, lat: number, lon: number): Promise<void> {
        const point: Point = {
            type: 'Point',
            coordinates: [lon, lat],
        };

        await this.driverProfileRepository.update(
            { user: { id: driverId } },
            { currentLocation: point }
        );
    }

    async findNearbyDrivers(lat: number, lon: number, radiusKm: number = 5): Promise<DriverProfile[]> {
        return this.driverProfileRepository
            .createQueryBuilder('driver')
            .leftJoinAndSelect('driver.user', 'user')
            .where('ST_DWithin(driver.currentLocation, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), :radius)', {
                lon,
                lat,
                radius: radiusKm * 1000,
            })
            .andWhere('driver.isOnline = :isOnline', { isOnline: true })
            .getMany();
    }
}
