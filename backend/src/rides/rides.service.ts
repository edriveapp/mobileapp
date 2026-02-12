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
        // .create() with an object literal always returns a single Ride
        const ride = this.ridesRepository.create({
            ...data,
            status: RideStatus.SEARCHING,
        });
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
}