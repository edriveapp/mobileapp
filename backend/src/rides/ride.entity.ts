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

    @ManyToOne(() => User)
    @JoinColumn({ name: 'passengerId' })
    passenger: User;

    @Column()
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

    @Column({ nullable: true }) // 'Lite', 'Comfort', 'Van'
    tier: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
