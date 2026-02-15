import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride, RideStatus } from './ride.entity';

@Injectable()
export class RidesService {
    constructor(
        @InjectRepository(Ride)
        private ridesRepository: Repository<Ride>,
    ) { }

    async createRide(data: any): Promise<Ride> {
        // Cast the object to DeepPartial<Ride> to help TypeORM pick the right overload
        const ride = this.ridesRepository.create({
            ...data,
            status: RideStatus.SEARCHING,
        } as Partial<Ride>); // Help TS realize this is ONE object

        return this.ridesRepository.save(ride);
    }

    async acceptRide(rideId: string, driverId: string): Promise<Ride> {
        // .findOne returns 'Ride | null'. We must check for null.
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });

        if (!ride) throw new NotFoundException('Ride not found'); // Use NestJS built-in exceptions
        if (ride.status !== RideStatus.SEARCHING) throw new Error('Ride no longer available');

        ride.driverId = driverId;
        ride.status = RideStatus.ACCEPTED;
        return this.ridesRepository.save(ride);
    }

    async updateStatus(rideId: string, status: RideStatus): Promise<Ride> {
        await this.ridesRepository.update(rideId, { status });

        // FIX: Ensure you are using findOne (not find) and handle the null case
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });

        if (!ride) {
            throw new NotFoundException('Ride not found');
        }

        return ride;
    }
    async getActiveRides(userId: string, role: string) {
        const query = this.ridesRepository.createQueryBuilder('ride')
            .leftJoinAndSelect('ride.driver', 'driver')
            .leftJoinAndSelect('ride.passenger', 'passenger')
            .where('ride.status IN (:...statuses)', { statuses: [RideStatus.SEARCHING, RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS] })
            .orderBy('ride.createdAt', 'DESC');

        if (role === 'driver') {
            query.andWhere('ride.driverId = :userId', { userId });
        } else {
            query.andWhere('ride.passengerId = :userId', { userId });
        }

        return query.getMany();
    }

    async getAvailableRides(filters: any) {
        const query = this.ridesRepository.createQueryBuilder('ride')
            .leftJoinAndSelect('ride.passenger', 'passenger') // For passenger requests?
            .leftJoinAndSelect('ride.driver', 'driver')       // For driver posts?
            .where('ride.status = :status', { status: RideStatus.SEARCHING });

        // If searching for driver posts (Inter-state):
        // We might want rides where driverId IS NOT NULL.
        // If searching for passenger requests (Driver app):
        // We might want rides where passengerId IS NOT NULL and driverId IS NULL.

        // For now, return all searching rides.
        // Add basic filtering if needed
        if (filters.tier) {
            query.andWhere('ride.tier = :tier', { tier: filters.tier });
        }

        return query.getMany();
    }

    async getHistory(userId: string, role: string, page: number = 1) {
        const take = 10;
        const skip = (page - 1) * take;

        const query = this.ridesRepository.createQueryBuilder('ride')
            .leftJoinAndSelect('ride.driver', 'driver')
            .leftJoinAndSelect('ride.passenger', 'passenger')
            .where('ride.status IN (:...statuses)', { statuses: [RideStatus.COMPLETED, RideStatus.CANCELLED] })
            .orderBy('ride.createdAt', 'DESC')
            .take(take)
            .skip(skip);

        if (role === 'driver') {
            query.andWhere('ride.driverId = :userId', { userId });
        } else {
            query.andWhere('ride.passengerId = :userId', { userId });
        }

        return query.getManyAndCount();
    }
}