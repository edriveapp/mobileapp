import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
    ) { }

    async saveMessage(rideId: string, text: string, senderId: string) {
        const message = this.messageRepository.create({
            rideId,
            text,
            senderId,
        });
        return this.messageRepository.save(message);
    }

    async getMessages(rideId: string) {
        return this.messageRepository.find({
            where: { rideId },
            order: { createdAt: 'ASC' },
            relations: ['sender'], // To get sender name if needed
        });
    }
}
