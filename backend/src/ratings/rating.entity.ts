import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ride } from '../rides/ride.entity';
import { User } from '../users/user.entity';

@Entity('ratings')
export class Rating {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Ride)
    @JoinColumn({ name: 'rideId' })
    ride: Ride;

    @Column()
    rideId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'raterId' })
    rater: User;

    @Column()
    raterId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'rateeId' })
    ratee: User;

    @Column()
    rateeId: string;

    @Column('int')
    value: number; // 1-5

    @Column({ type: 'text', nullable: true })
    comment: string;

    @CreateDateColumn()
    createdAt: Date;
}
