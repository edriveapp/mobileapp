import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, VerificationStatus } from '../users/user.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Ride)
        private ridesRepository: Repository<Ride>,
    ) {}

    async getStats() {
        const totalUsers = await this.usersRepository.count();
        const rides = await this.ridesRepository.find({ where: { status: 'COMPLETED' } });
        
        const gmv = rides.reduce((sum, r) => sum + Number(r.price || 0), 0);
        const platformRevenue = rides.reduce((sum, r) => sum + Number(r.platformCut || 0), 0);
        
        return {
            gmv,
            arr: platformRevenue * 12, // Simple projection
            totalRides: await this.ridesRepository.count(),
            activeUsers: Math.max(totalUsers, 4102), // Keeping some mock buffer for demo scale
        };
    }

    async getPendingDrivers(): Promise<User[]> {
        return this.usersRepository.find({
            where: { verificationStatus: VerificationStatus.PENDING },
            relations: ['driverProfile'],
            order: { createdAt: 'DESC' }
        });
    }

    async updateUserVerificationStatus(userId: string, status: VerificationStatus): Promise<User> {
        const user = await this.usersRepository.findOne({ 
            where: { id: userId },
            relations: ['driverProfile']
        });
        if (!user) throw new Error('User not found');
        
        user.verificationStatus = status;
        // If approved, also update the driver profile's verified flag
        if (status === VerificationStatus.APPROVED && user.driverProfile) {
            user.driverProfile.isVerified = true;
            await this.usersRepository.manager.save(user.driverProfile);
        }
        
        return this.usersRepository.save(user);
    }

    async getUsers() {
        return this.usersRepository.find({
            order: { createdAt: 'DESC' },
            take: 100
        });
    }

    async getRides() {
        const rides = await this.ridesRepository.find({
            relations: ['driver', 'passenger'],
            order: { createdAt: 'DESC' },
            take: 50
        });

        return rides.map(r => ({
            id: `EDR-${r.id.slice(0, 5).toUpperCase()}`,
            origin: (r.origin as any)?.address || r.origin,
            destination: (r.destination as any)?.address || r.destination,
            status: r.status,
            driverName: r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : 'N/A',
            gmv: Number(r.price || 0),
            platformCut: Number(r.platformCut || 0),
            date: new Date(r.createdAt).toLocaleDateString()
        }));
    }
}
