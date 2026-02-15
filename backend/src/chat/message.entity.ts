import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    text: string;

    @Column()
    rideId: string; // Linking to a Ride ID (string/uuid from Ride entity)

    @Column()
    senderId: string;

    @ManyToOne(() => User)
    sender: User;

    @CreateDateColumn()
    createdAt: Date;
}
