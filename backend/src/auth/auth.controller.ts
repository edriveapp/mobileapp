import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() req: { email?: string; password?: string }) {
        if (!req.email || !req.password) {
            throw new BadRequestException('Email and password are required.');
        }

        const user = await this.authService.validateUser(req.email, req.password);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password.');
        }

        return this.authService.login(user);
    }

    @Post('send-otp')
    @HttpCode(HttpStatus.OK)
    async sendOtp(@Body() body: { phoneNumber: string }) {
        return this.authService.sendOtp(body.phoneNumber);
    }

    @Post('register')
    async register(@Body() body: any) {
        const { otpCode, ...userData } = body;
        return this.authService.register(userData, otpCode);
    }
}
