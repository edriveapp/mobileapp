import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as admin from 'firebase-admin';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService implements OnModuleInit {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    onModuleInit() {
        // Initialize Firebase Admin SDK (only once)
        if (!admin.apps.length) {
            admin.initializeApp({
                projectId: this.configService.get<string>('FIREBASE_PROJECT_ID') || 'edrive-765ed',
            });
            this.logger.log('Firebase Admin SDK initialized');
        }
    }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);
        if (user && user.passwordHash === pass) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: User) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }

    async register(userData: any, firebaseIdToken: string) {
        // Verify the Firebase ID token
        let decodedToken: admin.auth.DecodedIdToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
        } catch (error: any) {
            this.logger.error(`Firebase token verification failed: ${error.message}`);
            throw new BadRequestException('Invalid or expired verification token. Please try again.');
        }

        // The phone number from the verified Firebase token
        const verifiedPhone = decodedToken.phone_number;
        if (!verifiedPhone) {
            throw new BadRequestException('Phone number not verified in token.');
        }

        this.logger.log(`Verified phone number from Firebase: ${verifiedPhone}`);

        // Check if user already exists
        let user = await this.usersService.findOneByEmail(userData.email);
        if (user) {
            throw new BadRequestException('User already exists');
        }

        // Create user with verified phone
        user = await this.usersService.create({
            ...userData,
            phone: verifiedPhone,
        });

        return this.login(user);
    }
}
