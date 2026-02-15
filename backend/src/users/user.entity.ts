import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
    PASSENGER = 'passenger',
    DRIVER = 'driver',
    ADMIN = 'admin',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

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

    @Column({ type: 'float', default: 5.0 })
    rating: number;

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    lastName: string;

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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
