import { createHmac } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

import { RidesService } from '../rides/rides.service';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
        private ridesService: RidesService,
    ) { }

    verifyWebhookSignature(rawBody: Buffer, paystackSignature: string): void {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');
        const hash = createHmac('sha512', secretKey).update(rawBody).digest('hex');
        if (hash !== paystackSignature) {
            throw new UnauthorizedException('Invalid webhook signature');
        }
    }

    async handleWebhookEvent(event: string, data: any): Promise<void> {
        if (event !== 'charge.success') return;

        const metadata = data?.metadata;
        const customFields = Array.isArray(metadata?.custom_fields) ? metadata.custom_fields : [];
        const customMap = customFields.reduce((acc: Record<string, any>, field: any) => {
            if (field?.variable_name) acc[field.variable_name] = field?.value;
            return acc;
        }, {});

        const rideId = metadata?.rideId || customMap?.ride_id;
        if (!rideId) {
            this.logger.warn(`Webhook charge.success missing rideId: ref=${data?.reference}`);
            return;
        }

        const amount = (data?.amount ?? 0) / 100;
        const distance = Number(metadata?.distanceInKm ?? customMap?.distance_km ?? 0);
        const split = this.calculatePaymentSplit(amount, distance);

        await this.ridesService.updatePaymentDetails(rideId, 'paid', split.driverAmount, split.platformFee, data?.reference);
        this.logger.log(`Webhook payment confirmed: rideId=${rideId} amount=₦${amount}`);
    }

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
            throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');
        }

        const url = 'https://api.paystack.co/transaction/initialize';
        const headers = {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
        };
        const data = {
            email,
            amount: amount * 100, // Paystack expects kobo
            callback_url: `${this.configService.get<string>('APP_URL') ?? ''}/payments/verify`,
            metadata: {
                rideId,
                distanceInKm,
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
            throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');
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
                const customFields = Array.isArray(metadata?.custom_fields) ? metadata.custom_fields : [];
                const customMap = customFields.reduce((acc: Record<string, any>, field: any) => {
                    if (field?.variable_name) acc[field.variable_name] = field?.value;
                    return acc;
                }, {});

                const rideId = metadata?.rideId || customMap?.ride_id;
                const amount = data.data.amount / 100; // Convert back from kobo
                const distance = Number(metadata?.distanceInKm ?? customMap?.distance_km ?? 0);

                if (rideId) {
                    const split = this.calculatePaymentSplit(amount, distance);
                    await this.ridesService.updatePaymentDetails(
                        rideId,
                        'paid',
                        split.driverAmount,
                        split.platformFee,
                        data.data.reference,
                    );
                }
            }

            return data;
        } catch (error) {
            throw new InternalServerErrorException('Payment verification failed');
        }
    }

    async initiateRefund(rideId: string, reason: string, amountNaira?: number): Promise<{ refundReference: string; amount: number }> {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');

        // Get the ride to find its Paystack reference
        const ride = await this.ridesService.findRideById(rideId);
        if (!ride) throw new NotFoundException('Ride not found');
        if (!ride.paystackReference) throw new BadRequestException('No payment reference found for this ride — cash rides cannot be refunded via Paystack');
        if (ride.paymentStatus === 'refunded') throw new BadRequestException('This ride has already been refunded');
        if (ride.paymentStatus !== 'paid') throw new BadRequestException('Only paid rides can be refunded');

        const refundAmountKobo = amountNaira ? Math.round(amountNaira * 100) : undefined;

        const url = 'https://api.paystack.co/refund';
        const headers = { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' };
        const body: any = { transaction: ride.paystackReference };
        if (refundAmountKobo) body.amount = refundAmountKobo;

        try {
            const response = await lastValueFrom(this.httpService.post(url, body, { headers }));
            const refundData = response.data?.data;
            const refundReference = refundData?.id?.toString() || `refund_${Date.now()}`;
            const refundedAmount = (refundData?.amount ?? refundAmountKobo ?? (Number(ride.tripFare) * 100)) / 100;

            await this.ridesService.markRefunded(rideId, refundReference, reason);
            this.logger.log(`Refund initiated for ride ${rideId}: ref=${refundReference} amount=₦${refundedAmount}`);
            return { refundReference, amount: refundedAmount };
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            this.logger.error(`Paystack refund failed for ride ${rideId}: ${msg}`);
            throw new InternalServerErrorException(`Refund failed: ${msg}`);
        }
    }
}
