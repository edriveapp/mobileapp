import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum WarningLevel {
    MINOR = 'minor',
    MAJOR = 'major',
    FINAL = 'final',
}

@Entity('driver_warnings')
export class DriverWarning {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    driverId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'driverId' })
    driver: User;

    @Column()
    issuedById: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'issuedById' })
    issuedBy: User;

    @Column({ type: 'enum', enum: WarningLevel, default: WarningLevel.MINOR })
    level: WarningLevel;

    @Column({ type: 'text' })
    reason: string;

    @CreateDateColumn()
    createdAt: Date;
}
