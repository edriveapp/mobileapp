import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride, RideStatus } from '../rides/ride.entity';
import { Rating } from './rating.entity';

@Injectable()
export class RatingsService {
    constructor(
        @InjectRepository(Rating)
        private ratingsRepository: Repository<Rating>,
        @InjectRepository(Ride)
        private ridesRepository: Repository<Ride>,
    ) { }

    async createRating(data: Partial<Rating> & { raterId: string }) {
        if (!data.rideId || !data.rateeId || !data.raterId) {
            throw new BadRequestException('rideId, rateeId, and raterId are required');
        }
        if (!data.value || data.value < 1 || data.value > 5) {
            throw new BadRequestException('Rating value must be between 1 and 5');
        }

        const ride = await this.ridesRepository.findOne({ where: { id: data.rideId } });
        if (!ride) throw new NotFoundException('Ride not found');
        if (ride.status !== RideStatus.COMPLETED) {
            throw new BadRequestException('Can only rate completed rides');
        }

        const isDriver = ride.driverId === data.raterId;
        const isPassenger = ride.passengerId === data.raterId;
        if (!isDriver && !isPassenger) {
            throw new ForbiddenException('You were not a participant in this ride');
        }

        // Driver can rate passenger and vice versa — not themselves
        if (isDriver && data.rateeId !== ride.passengerId) {
            throw new ForbiddenException('Drivers can only rate their passenger');
        }
        if (isPassenger && data.rateeId !== ride.driverId) {
            throw new ForbiddenException('Passengers can only rate their driver');
        }

        // Prevent duplicate ratings for the same ride by the same rater
        const existing = await this.ratingsRepository.findOne({
            where: { rideId: data.rideId, raterId: data.raterId },
        });
        if (existing) throw new BadRequestException('You have already rated this ride');

        const rating = this.ratingsRepository.create(data);
        return this.ratingsRepository.save(rating);
    }

    async getRatingsForUser(userId: string) {
        return this.ratingsRepository.find({ where: { rateeId: userId } });
    }

    async getAverageRating(userId: string): Promise<number> {
        const ratings = await this.getRatingsForUser(userId);
        if (ratings.length === 0) return 5.0;

        const sum = ratings.reduce((acc, r) => acc + r.value, 0);
        return parseFloat((sum / ratings.length).toFixed(1));
    }
}
