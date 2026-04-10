import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { EmailOtpService } from './email-otp.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private emailOtpService: EmailOtpService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);
        if (user && user.passwordHash && await bcrypt.compare(pass, user.passwordHash)) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: User) {
        const payload = { email: user.email, sub: user.id, role: user.role, adminScope: user.adminScope };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }

    async sendOtp(email: string) {
        if (!email) {
            throw new BadRequestException('Email is required.');
        }
        return this.emailOtpService.sendOtp(email);
    }

    async register(userData: any, otpCode: string) {
        const email = userData.email;

        if (!email || !otpCode) {
            throw new BadRequestException('Email and OTP code are required.');
        }

        const isValid = await this.emailOtpService.verifyOtp(email, otpCode);
        if (!isValid) {
            throw new BadRequestException('Invalid or expired OTP code. Please try again.');
        }

        this.logger.log(`OTP verified for email: ${email}`);

        let user = await this.usersService.findOneByEmail(email);
        if (user) {
            throw new BadRequestException('An account with this email already exists.');
        }

        const rawPassword = userData.password || userData.passwordHash || '';
        const hashedPassword = rawPassword ? await bcrypt.hash(rawPassword, 12) : '';
        user = await this.usersService.create({
            email: userData.email,
            phone: userData.phone,
            passwordHash: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role || UserRole.PASSENGER,
        });

        return this.login(user);
    }

    async forgotPassword(email: string) {
        if (!email) {
            throw new BadRequestException('Email is required.');
        }
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            // Return success anyway to avoid email enumeration
            return { success: true };
        }
        await this.emailOtpService.sendOtp(email);
        return { success: true };
    }

    async resetPassword(email: string, otpCode: string, newPassword: string) {
        if (!email || !otpCode || !newPassword) {
            throw new BadRequestException('Email, OTP, and new password are required.');
        }
        if (newPassword.length < 6) {
            throw new BadRequestException('Password must be at least 6 characters.');
        }

        const isValid = await this.emailOtpService.verifyOtp(email, otpCode);
        if (!isValid) {
            throw new BadRequestException('Invalid or expired OTP code.');
        }

        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException('Account not found.');
        }

        await this.usersService.updatePassword(user.id, newPassword);
        this.logger.log(`Password reset for ${email}`);
        return { success: true };
    }
}
