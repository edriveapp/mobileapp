import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

import { RidesService } from '../rides/rides.service';

@Injectable()
export class PaymentsService {
    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
        private ridesService: RidesService,
    ) { }

    calculatePaymentSplit(amount: number, distanceInKm: number) {
        let driverPercentage = 85; // Up to 200 km
        if (distanceInKm > 500) {
            driverPercentage = 65; // Platform max 35%
        } else if (distanceInKm > 200) {
            driverPercentage = 75; // Platform 25%
        }

        const platformPercentage = 100 - driverPercentage;
        const driverAmount = (amount * driverPercentage) / 100;
        const platformFee = (amount * platformPercentage) / 100;

        return { driverAmount, platformFee, driverPercentage, platformPercentage };
    }

    async initializePayment(email: string, amount: number, distanceInKm: number, rideId: string) {
        const split = this.calculatePaymentSplit(amount, distanceInKm);
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
                    metadata: { rideId, distanceInKm, split }
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
            metadata: {
                custom_fields: [
                    { display_name: "Ride ID", variable_name: "ride_id", value: rideId },
                    { display_name: "Distance (km)", variable_name: "distance_km", value: distanceInKm },
                    { display_name: "Driver Cut", variable_name: "driver_amount", value: split.driverAmount },
                    { display_name: "Platform Fee", variable_name: "platform_fee", value: split.platformFee }
                ]
            }
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
            const data = response.data;

            if (data.status && data.data.status === 'success') {
                const metadata = data.data.metadata;
                const rideId = metadata?.rideId;
                const amount = data.data.amount / 100; // Convert back from kobo
                const distance = metadata?.distanceInKm || 0;

                if (rideId) {
                    const split = this.calculatePaymentSplit(amount, distance);
                    await this.ridesService.updatePaymentDetails(
                        rideId, 
                        'paid', 
                        split.driverAmount, 
                        split.platformFee
                    );
                }
            }

            return data;
        } catch (error) {
            throw new InternalServerErrorException('Payment verification failed');
        }
    }
}
