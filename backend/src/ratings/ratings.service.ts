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

    async createRating(raterId: string, data: any) {
        // [VULN: BROKEN ACCESS CONTROL] - raterId is passed from the auth context, not the request body
        if (!data.rideId || !data.rateeId) {
            throw new BadRequestException('rideId and rateeId are required');
        }

        // [VULN: WEAK VALIDATION] - Strict type and range validation
        if (typeof data.value !== 'number' || data.value < 1 || data.value > 5) {
            throw new BadRequestException('Rating value must be a number between 1 and 5');
        }

        if (raterId === data.rateeId) {
            throw new BadRequestException('You cannot rate yourself');
        }

        const ride = await this.ridesRepository.findOne({ where: { id: data.rideId } });
        if (!ride) throw new NotFoundException('Ride not found');
        
        if (ride.status !== RideStatus.COMPLETED) {
            throw new BadRequestException('Can only rate completed rides');
        }

        // [LOGIC: RATING WINDOW] - Ratings must be submitted within 7 days of ride completion
        const rideAge = Date.now() - new Date(ride.updatedAt || ride.createdAt).getTime();
        const days = rideAge / (1000 * 60 * 60 * 24);
        if (days > 7) {
            throw new BadRequestException('Rating window expired (7 days max)');
        }

        const isDriver = ride.driverId === raterId;
        const isPassenger = ride.passengerId === raterId;
        
        if (!isDriver && !isPassenger) {
            throw new ForbiddenException('You were not a participant in this ride');
        }

        if (isDriver && data.rateeId !== ride.passengerId) {
            throw new ForbiddenException('Drivers can only rate their passenger');
        }
        if (isPassenger && data.rateeId !== ride.driverId) {
            throw new ForbiddenException('Passengers can only rate their driver');
        }

        // Prevent duplicate ratings for the same participant in the same ride
        const existing = await this.ratingsRepository.findOne({
            where: { rideId: data.rideId, raterId: raterId, rateeId: data.rateeId },
        });
        if (existing) throw new BadRequestException('You have already rated this participant for this ride');

        const rating = this.ratingsRepository.create({
            ...data,
            raterId: raterId,
        });
        return this.ratingsRepository.save(rating);
    }

    async getRatingsForUser(userId: string) {
        return this.ratingsRepository.find({ where: { rateeId: userId } });
    }

    async getAverageRating(userId: string): Promise<number> {
        // [PERF: DB AGGREGATION] - Use SQL AVG for performance at scale
        const result = await this.ratingsRepository
            .createQueryBuilder('rating')
            .select('AVG(rating.value)', 'avg')
            .where('rating.rateeId = :userId', { userId })
            .getRawOne();

        if (!result || result.avg === null) return 5.0;
        
        return parseFloat(parseFloat(result.avg).toFixed(1));
    }
}
