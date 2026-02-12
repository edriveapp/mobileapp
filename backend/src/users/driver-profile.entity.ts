import { Point } from 'geojson';
import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('driver_profiles')
export class DriverProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User)
    @JoinColumn()
    user: User;

    @Column('jsonb', { nullable: true })
    vehicleDetails: {
        make: string;
        model: string;
        year: string;
        color: string;
        plateNumber: string;
    };

    @Column('jsonb', { nullable: true })
    licenseDetails: {
        number: string;
        expiryDate: string;
        documentUrl: string;
    };

    @Column({ default: false })
    isVerified: boolean;

    @Index({ spatial: true })
    @Column({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    })
    currentLocation: Point;

    @Column({ default: false })
    isOnline: boolean;
}
