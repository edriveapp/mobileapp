import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Ride } from './ride.entity';

export enum BookingStatus {
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed',
}

@Entity('bookings')
export class Booking {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Ride, (ride) => ride.bookings, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'rideId' })
    ride: Ride;

    @Column({ type: 'uuid' })
    rideId: string;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'passengerId' })
    passenger: User;

    @Column({ type: 'uuid' })
    passengerId: string;

    @Column({ type: 'int', default: 1 })
    seatsBooked: number;

    @Column('simple-json', { nullable: true })
    pickupLocation: {
        lat: number;
        lon: number;
        address: string;
    };

    @Column({ nullable: true, default: 'cash' })
    paymentMethod: string;

    @Column({ nullable: true, default: 'pending' })
    paymentStatus: string;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    fareCharged: number;

    @Column({ nullable: true })
    paystackReference: string;

    @Column({
        type: 'enum',
        enum: BookingStatus,
        default: BookingStatus.CONFIRMED,
    })
    status: BookingStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
