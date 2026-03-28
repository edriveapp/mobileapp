import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DriverProfile } from './driver-profile.entity';

export enum UserRole {
    PASSENGER = 'passenger',
    DRIVER = 'driver',
    ADMIN = 'admin',
}

export enum AdminScope {
    NONE = 'none',
    SUPER_ADMIN = 'super_admin',
    VERIFICATION = 'verification',
    SUPPORT = 'support',
    OPERATIONS = 'operations',
}

export enum VerificationStatus {
    UNVERIFIED = 'unverified',
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => DriverProfile, (profile) => profile.user)
    driverProfile: DriverProfile;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    passwordHash: string; // Only if using password auth

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.PASSENGER,
    })
    role: UserRole;

    @Column({
        type: 'enum',
        enum: AdminScope,
        default: AdminScope.NONE,
    })
    adminScope: AdminScope;

    @Column({ type: 'float', default: 5.0 })
    rating: number;

    @Column({
        type: 'enum',
        enum: VerificationStatus,
        default: VerificationStatus.UNVERIFIED,
    })
    verificationStatus: VerificationStatus;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    balance: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    pendingRemittance: number;

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    lastName: string;

    @Column({ nullable: true })
    avatarUrl: string;

    @Column({
        type: 'jsonb',
        nullable: true,
        default: () => `'{"pushNotifications": true, "emailNotifications": true, "biometricLogin": false}'`,
    })
    preferences: {
        pushNotifications: boolean;
        emailNotifications: boolean;
        biometricLogin: boolean;
    };

    @Column({
        type: 'jsonb',
        nullable: false,
        default: () => "'[]'",
    })
    expoPushTokens: string[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
