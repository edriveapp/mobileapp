import { createHmac } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

import { RidesService } from '../rides/rides.service';
import { RidesGateway } from '../rides/rides.gateway';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Booking, BookingStatus } from '../rides/booking.entity';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
        private ridesService: RidesService,
        private ridesGateway: RidesGateway,
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectRepository(Booking) private bookingsRepository: Repository<Booking>,
    ) { }

    verifyWebhookSignature(rawBody: Buffer, paystackSignature: string): void {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');
        const hash = createHmac('sha512', secretKey).update(rawBody).digest('hex');
        if (hash !== paystackSignature) {
            throw new UnauthorizedException('Invalid webhook signature');
        }
    }

    private parseMetadata(metadata: any) {
        const customFields = Array.isArray(metadata?.custom_fields) ? metadata.custom_fields : [];
        const customMap = customFields.reduce((acc: Record<string, any>, field: any) => {
            if (field?.variable_name) acc[field.variable_name] = field?.value;
            return acc;
        }, {});

        return {
            rideId: metadata?.rideId || customMap?.ride_id,
            userId: metadata?.userId || customMap?.user_id,
            remittanceUserId: metadata?.remittanceUserId || customMap?.user_id,
            isRemittance: metadata?.isRemittance || customMap?.is_remittance,
            pickupLocation: metadata?.pickupLocation,
            distanceInKm: Number(metadata?.distanceInKm ?? customMap?.distance_km ?? 0),
            estimatedDurationMinutes: Number(metadata?.estimatedDurationMinutes ?? customMap?.estimated_duration_minutes ?? 0),
        };
    }

    private async processPaystackSuccessPayload(payload: any): Promise<void> {
        const metadata = this.parseMetadata(payload?.metadata);
        const rideId = metadata.rideId;
        const userId = metadata.userId;
        const remittanceUserId = metadata.remittanceUserId;
        const isRemittance = metadata.isRemittance;
        const pickupLocation = metadata.pickupLocation;
        const estimatedDurationMinutes = metadata.estimatedDurationMinutes;

        if (await this.ridesService.isPaymentReferenceProcessed(payload?.reference)) {
            this.logger.log(`Paystack transaction already processed: ${payload?.reference}`);
            return;
        }

        const amount = (payload?.amount ?? 0) / 100;
        if (isRemittance && remittanceUserId) {
            await this.ridesService.processRemittancePayment(remittanceUserId, amount, payload?.reference);
            this.logger.log(`Remittance payment confirmed: userId=${remittanceUserId} amount=₦${amount}`);
            return;
        }

        if (!rideId) {
            this.logger.warn(`Paystack success payload missing rideId: ref=${payload?.reference}`);
            return;
        }

        const ride = await this.ridesService.findRideById(rideId);
        if (!ride) {
            this.logger.error(`Paystack success payload: Ride ${rideId} not found`);
            return;
        }

        const split = await this.calculatePaymentSplit(amount, estimatedDurationMinutes);
        const paymentDetails = {
            driverNetEarnings: split.driverNetEarnings,
            platformCut: split.platformCutAmount,
            platformCutPercent: split.platformCutPercent,
            insuranceReserveAmount: split.insuranceReserveAmount,
            insuranceReservePercent: split.insuranceReservePercent,
            paystackReference: payload?.reference,
            paymentReference: payload?.reference,
            estimatedDurationMinutes,
            pickupLocation,
        };

        if (ride.passengerId === userId || ride.driverId === userId) {
            await this.ridesService.updatePaymentDetails(rideId, 'paid', paymentDetails);
            this.logger.log(`Direct payment confirmed: rideId=${rideId} userId=${userId}`);
            return;
        }

        if (userId) {
            const bookedRide = await this.ridesService.bookPublishedTrip(rideId, userId, {
                paymentMethod: 'card',
                paymentStatus: 'paid',
                pickupLocation,
                estimatedDurationMinutes,
                ...paymentDetails,
            });
            await this.ridesGateway.broadcastTripBooked(bookedRide);
            this.logger.log(`Shared booking confirmed: rideId=${rideId} userId=${userId}`);
            return;
        }

        this.logger.warn(`Paystack success payload missing userId for rideId=${rideId}`);
        await this.ridesService.updatePaymentDetails(rideId, 'paid', paymentDetails);
    }

    async handleWebhookEvent(event: string, data: any): Promise<void> {
        if (event !== 'charge.success') return;
        await this.processPaystackSuccessPayload(data);
    }

    async calculatePaymentSplit(amount: number, estimatedDurationMinutes: number) {
        let platformCutPercent = estimatedDurationMinutes > 60 ? 15 : 12; // default fallback
        
        try {
            const settingsUser = await this.usersRepository.findOne({ where: { email: '__settings__' } });
            const prefs = (settingsUser?.preferences as any) || {};
            if (typeof prefs.platformCutPercent === 'number') {
                platformCutPercent = prefs.platformCutPercent;
            }
        } catch (e) {
            this.logger.warn('Failed to fetch platform settings, using defaults', e);
        }
        const insuranceReservePercent = 2;
        const platformCutAmount = Number(((amount * platformCutPercent) / 100).toFixed(2));
        const insuranceReserveAmount = Number(((amount * insuranceReservePercent) / 100).toFixed(2));
        const driverNetEarnings = Number((amount - platformCutAmount - insuranceReserveAmount).toFixed(2));

        return {
            grossAmount: Number(amount.toFixed(2)),
            platformCutPercent,
            insuranceReservePercent,
            platformCutAmount,
            insuranceReserveAmount,
            driverNetEarnings,
        };
    }

    async initializePayment(userId: string, email: string, distanceInKm: number, estimatedDurationMinutes: number, rideId: string, pickupLocation?: any) {
        const ride = await this.ridesService.findRideById(rideId);
        if (!ride) throw new NotFoundException('Ride not found');

        let amount = 0;
        if (ride.passengerId === userId || ride.driverId === userId) {
            amount = Number(ride.tripFare || ride.fare || 0);
        } else {
            const booking = await this.bookingsRepository.findOne({ where: { rideId, passengerId: userId, status: BookingStatus.CONFIRMED } });
            if (booking) {
                amount = Number(booking.fareCharged || 0);
            } else {
                // If it's a new booking request for a published trip
                amount = Number(ride.fare || ride.tripFare || 0);
            }
        }

        if (amount <= 0) {
            throw new BadRequestException('Amount must be greater than zero');
        }

        const split = await this.calculatePaymentSplit(amount, estimatedDurationMinutes);
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
            channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
            callback_url: `${this.configService.get<string>('APP_URL') ?? ''}/payments/verify`,
            metadata: {
                rideId,
                userId,
                pickupLocation,
                distanceInKm,
                estimatedDurationMinutes,
                custom_fields: [
                    { display_name: "Ride ID", variable_name: "ride_id", value: rideId },
                    { display_name: "User ID", variable_name: "user_id", value: userId },
                    { display_name: "Distance (km)", variable_name: "distance_km", value: distanceInKm },
                    { display_name: "Estimated Duration (minutes)", variable_name: "estimated_duration_minutes", value: estimatedDurationMinutes },
                    { display_name: "Driver Net Earnings", variable_name: "driver_net_earnings", value: split.driverNetEarnings },
                    { display_name: "Platform Fee", variable_name: "platform_fee", value: split.platformCutAmount },
                    { display_name: "Insurance Reserve", variable_name: "insurance_reserve", value: split.insuranceReserveAmount }
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

    async initializeRemittance(userId: string, email: string) {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        
        const amount = Number(user.pendingRemittance || 0);
        if (amount <= 0) {
            throw new BadRequestException('No pending remittance due');
        }

        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');

        const url = 'https://api.paystack.co/transaction/initialize';
        const headers = { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' };
        const data = {
            email,
            amount: amount * 100, // Paystack expects kobo
            channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
            callback_url: `${this.configService.get<string>('APP_URL') ?? ''}/payments/verify`,
            metadata: {
                remittanceUserId: userId,
                custom_fields: [
                    { display_name: "Remittance", variable_name: "is_remittance", value: true },
                    { display_name: "User ID", variable_name: "user_id", value: userId }
                ]
            }
        };

        try {
            const response = await lastValueFrom(this.httpService.post(url, data, { headers }));
            return response.data;
        } catch (error) {
            this.logger.error('Remittance initialization failed:', error.response?.data || error.message);
            throw new InternalServerErrorException('Remittance initialization failed');
        }
    }

    async verifyPayment(reference: string) {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) {
            throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(reference)) {
            throw new BadRequestException('Invalid reference format');
        }

        const url = `https://api.paystack.co/transaction/verify/${reference}`;
        const headers = {
            Authorization: `Bearer ${secretKey}`,
        };

        try {
            const response = await lastValueFrom(this.httpService.get(url, { headers }));
            const data = response.data;

            if (data.status && data.data?.status === 'success') {
                await this.processPaystackSuccessPayload(data.data);
                return data;
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

    async getBanks() {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) {
            throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');
        }

        try {
            const response = await lastValueFrom(this.httpService.get('https://api.paystack.co/bank?country=nigeria&perPage=200', {
                headers: { Authorization: `Bearer ${secretKey}` },
            }));
            const banks = Array.isArray(response.data?.data) ? response.data.data : [];
            return banks.map((bank: any) => ({
                id: String(bank.id),
                name: String(bank.name || ''),
                code: String(bank.code || ''),
            }));
        } catch (error) {
            this.logger.error(`Bank list fetch failed: ${error.response?.data?.message || error.message}`);
            throw new InternalServerErrorException('Could not load bank list');
        }
    }

    async resolveAccountNumber(accountNumber: string, bankCode: string) {
        const normalizedAccountNumber = String(accountNumber || '').replace(/\D/g, '');
        const normalizedBankCode = String(bankCode || '').trim();
        if (normalizedAccountNumber.length !== 10) {
            throw new BadRequestException('Account number must be 10 digits');
        }
        if (!normalizedBankCode) {
            throw new BadRequestException('Bank code is required');
        }

        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) {
            throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');
        }

        try {
            const response = await lastValueFrom(this.httpService.get('https://api.paystack.co/bank/resolve', {
                headers: { Authorization: `Bearer ${secretKey}` },
                params: { account_number: normalizedAccountNumber, bank_code: normalizedBankCode },
            }));
            const data = response.data?.data;
            return {
                accountName: data?.account_name || '',
                accountNumber: data?.account_number || normalizedAccountNumber,
                bankCode: normalizedBankCode,
            };
        } catch (error) {
            const message = error.response?.data?.message || 'Could not resolve account number';
            throw new BadRequestException(message);
        }
    }
}
