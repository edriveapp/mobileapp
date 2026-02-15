import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { SmsService } from './sms.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private smsService: SmsService,
    ) { }

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

    async sendOtp(phoneNumber: string) {
        if (!phoneNumber) {
            throw new BadRequestException('Phone number is required.');
        }
        return this.smsService.sendOtp(phoneNumber);
    }

    async register(userData: any, otpCode: string) {
        const phoneNumber = userData.phone;

        if (!phoneNumber || !otpCode) {
            throw new BadRequestException('Phone number and OTP code are required.');
        }

        // Verify the OTP via Twilio
        const isValid = await this.smsService.verifyOtp(phoneNumber, otpCode);
        if (!isValid) {
            throw new BadRequestException('Invalid or expired OTP code. Please try again.');
        }

        this.logger.log(`OTP verified for phone number: ${phoneNumber}`);

        // Check if user already exists
        let user = await this.usersService.findOneByEmail(userData.email);
        if (user) {
            throw new BadRequestException('User already exists');
        }

        // Create user with verified phone
        user = await this.usersService.create(userData);

        return this.login(user);
    }
}
