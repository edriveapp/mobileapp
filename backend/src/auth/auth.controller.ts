import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() req: { email?: string; password?: string; state?: string }) {
        if (!req.email || !req.password) {
            throw new BadRequestException('Email and password are required.');
        }
        // Admin dashboard logins must supply a state token (CSRF / replay protection).
        // Mobile OTP-based flows do not hit this endpoint so the check is safe here.
        if (!req.state?.trim() || req.state.length < 8) {
            throw new BadRequestException('Invalid or missing state parameter.');
        }
        const user = await this.authService.validateUser(req.email, req.password);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password.');
        }
        return this.authService.login(user);
    }

    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @Post('send-otp')
    @HttpCode(HttpStatus.OK)
    async sendOtp(@Body() body: { email: string }) {
        return this.authService.sendOtp(body.email);
    }

    @Post('register')
    async register(@Body() body: any) {
        const { otpCode, ...userData } = body;
        return this.authService.register(userData, otpCode);
    }

    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() body: { email: string }) {
        return this.authService.forgotPassword(body.email);
    }

    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() body: { email: string; otp: string; newPassword: string }) {
        return this.authService.resetPassword(body.email, body.otp, body.newPassword);
    }
}
