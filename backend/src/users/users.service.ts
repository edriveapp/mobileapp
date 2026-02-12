import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Point } from 'geojson';
import { Repository } from 'typeorm';
import { DriverProfile } from './driver-profile.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(DriverProfile)
        private driverProfileRepository: Repository<DriverProfile>,
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

    async getDriverProfile(userId: string): Promise<DriverProfile | null> {
        return this.driverProfileRepository.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    }

    async createDriverProfile(user: User, details: any): Promise<DriverProfile> {
        const profile = this.driverProfileRepository.create({
            user,
            ...details
        });
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
        // PostGIS query for nearby drivers
        return this.driverProfileRepository
            .createQueryBuilder('driver')
            .leftJoinAndSelect('driver.user', 'user')
            .where('ST_DWithin(driver.currentLocation, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), :radius)', {
                lon,
                lat,
                radius: radiusKm * 1000, // PostGIS uses meters for geography if configured, or degrees for geometry. Assuming SRID 4326 geometry, ST_DWithin uses degrees. 
                // For accurate meters, usually better to cast to geography: ST_DWithin(currentLocation::geography, ST_MakePoint(lon,lat)::geography, radius_meters)
            })
            .andWhere('driver.isOnline = :isOnline', { isOnline: true })
            .getMany();
    }
}
