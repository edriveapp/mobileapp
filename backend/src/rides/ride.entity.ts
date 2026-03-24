import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum RideStatus {
    SEARCHING = 'searching',
    ACCEPTED = 'accepted',
    ARRIVED = 'arrived',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('rides')
export class Ride {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'passengerId' })
    passenger: User;

    @Column({ nullable: true })
    passengerId: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'driverId' })
    driver: User;

    @Column({ nullable: true })
    driverId: string;

    @Column('simple-json')
    origin: {
        lat: number;
        lon: number;
        address: string;
    };

    @Column('simple-json')
    destination: {
        lat: number;
        lon: number;
        address: string;
    };

    @Column({
        type: 'enum',
        enum: RideStatus,
        default: RideStatus.SEARCHING,
    })
    status: RideStatus;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    fare: number;

    @Column({ type: 'int', nullable: true, default: 0 })
    distanceKm: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    tripFare: number;

    @Column('simple-json', { nullable: true })
    pickupLocation: {
        lat: number;
        lon: number;
        address: string;
    };

    @Column({ type: 'int', default: 1 })
    seats: number;

    @Column({ type: 'int', default: 1 })
    availableSeats: number;

    @Column({ nullable: true }) // 'Lite', 'Comfort', 'Van'
    tier: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column('simple-json', { nullable: true })
    preferences: {
        ac?: boolean;
        luggage?: boolean;
        smoking?: boolean;
    };

    @Column({ default: false })
    autoAccept: boolean;

    @Column({ nullable: true })
    paymentMethod: string;

    @Column({ nullable: true })
    paymentStatus: string;

    @Column({ nullable: true })
    pricingScenario: string;

    @Column('simple-json', { nullable: true })
    pricingBreakdown: {
        baseCost?: number;
        subtotal?: number;
        operationsBuffer?: number;
        marginAmount?: number;
        finalTripFare?: number;
        seatFare?: number;
    };

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    driverEarnings: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    platformCut: number;

    @Column({ nullable: true })
    departureTime: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
