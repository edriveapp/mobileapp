import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Twilio = require('twilio');

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private client: any;
    private verifyServiceSid: string;

    constructor(private configService: ConfigService) {
        const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
        const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
        this.verifyServiceSid = this.configService.get<string>('TWILIO_VERIFY_SERVICE_SID') || '';

        if (!accountSid || !authToken || !this.verifyServiceSid) {
            this.logger.warn('Twilio credentials not fully configured. SMS will not work.');
        }

        this.client = new Twilio(accountSid, authToken);
        this.logger.log('Twilio SMS service initialized');
    }

    async sendOtp(phoneNumber: string): Promise<{ success: boolean }> {
        try {
            const verification = await this.client.verify.v2
                .services(this.verifyServiceSid)
                .verifications.create({
                    to: phoneNumber,
                    channel: 'sms',
                    // @ts-ignore — codeLength is supported but not in all type versions
                    codeLength: 4,
                });

            this.logger.log(`OTP sent to ${phoneNumber}, status: ${verification.status}`);
            return { success: true };
        } catch (error: any) {
            this.logger.error(`Failed to send OTP to ${phoneNumber}: ${error.message}`);
            throw error;
        }
    }

    async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
        try {
            const check = await this.client.verify.v2
                .services(this.verifyServiceSid)
                .verificationChecks.create({
                    to: phoneNumber,
                    code,
                });

            this.logger.log(`OTP verification for ${phoneNumber}: ${check.status}`);
            return check.status === 'approved';
        } catch (error: any) {
            this.logger.error(`OTP verification failed for ${phoneNumber}: ${error.message}`);
            throw error;
        }
    }
}
