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
        type?: string;
        make: string;
        model: string;
        year: string;
        color?: string;
        plateNumber: string;
        capacity?: string;
        insuranceDocumentUrl?: string;
        worthinessCertificateUrl?: string;
        vehiclePhotoUrls?: string[];
    };

    @Column('jsonb', { nullable: true })
    licenseDetails: {
        number: string;
        expiryDate: string;
        documentUrl: string;
    };

    @Column('jsonb', { nullable: true })
    onboardingMeta?: {
        fullName?: string;
        phoneNumber?: string;
        dateOfBirth?: string;
        nin?: string;
        address?: string;
        guarantorName?: string;
        guarantorPhone?: string;
        nextOfKinName?: string;
        nextOfKinPhone?: string;
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
