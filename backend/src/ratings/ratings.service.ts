import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './rating.entity';

@Injectable()
export class RatingsService {
    constructor(
        @InjectRepository(Rating)
        private ratingsRepository: Repository<Rating>,
    ) { }

    async createRating(data: Partial<Rating>) {
        const rating = this.ratingsRepository.create(data);
        return this.ratingsRepository.save(rating);
    }

    async getRatingsForUser(userId: string) {
        return this.ratingsRepository.find({ where: { rateeId: userId } });
    }

    async getAverageRating(userId: string): Promise<number> {
        const ratings = await this.getRatingsForUser(userId);
        if (ratings.length === 0) return 5.0; // Default new users to 5.0? Or 0? Let's say 5.0 for encouragement.

        const sum = ratings.reduce((acc, r) => acc + r.value, 0);
        return parseFloat((sum / ratings.length).toFixed(1));
    }
}
