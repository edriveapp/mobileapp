import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PaymentsService {
    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
    ) { }

    async initializePayment(email: string, amount: number) {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) {
            console.warn('PAYSTACK_SECRET_KEY not found. Using mock payment.');
            return {
                status: true,
                message: 'Authorization URL created',
                data: {
                    authorization_url: 'https://checkout.paystack.com/mock-url', // Mock URL
                    access_code: 'mock_code',
                    reference: 'mock_ref_' + Date.now(),
                },
            };
        }

        const url = 'https://api.paystack.co/transaction/initialize';
        const headers = {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
        };
        const data = {
            email,
            amount: amount * 100, // Paystack expects kobo
            callback_url: 'http://localhost:3000/payments/verify', // Or deep link to app
        };

        try {
            const response = await lastValueFrom(this.httpService.post(url, data, { headers }));
            return response.data;
        } catch (error) {
            console.error('Payment initialization failed:', error.response?.data || error.message);
            throw new InternalServerErrorException('Payment initialization failed');
        }
    }

    async verifyPayment(reference: string) {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) {
            return { status: true, message: 'Verification successful', data: { status: 'success' } };
        }

        const url = `https://api.paystack.co/transaction/verify/${reference}`;
        const headers = {
            Authorization: `Bearer ${secretKey}`,
        };

        try {
            const response = await lastValueFrom(this.httpService.get(url, { headers }));
            return response.data;
        } catch (error) {
            throw new InternalServerErrorException('Payment verification failed');
        }
    }
}
