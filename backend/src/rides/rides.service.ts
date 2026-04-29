import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, MoreThanOrEqual, Repository } from 'typeorm';
import { OSRMService } from '../common/osrm.service';
import { RedisService } from '../common/redis.service';
import { Ride, RideStatus } from './ride.entity';
import { Booking, BookingStatus } from './booking.entity';
import { User } from '../users/user.entity';
import { WalletTransaction, WalletTransactionType } from '../users/wallet-transaction.entity';
import { buildTrendingAreas } from './trending-areas.util';

// TTLs (seconds)
const AVAILABLE_RIDES_TTL = 30;
const TRENDING_AREAS_TTL = 300;
const RIDE_STATE_TTL = 1800; // 30 min

@Injectable()
export class RidesService {
    private readonly logger = new Logger(RidesService.name);

    constructor(
        @InjectRepository(Ride)
        private ridesRepository: Repository<Ride>,
        @InjectRepository(Booking)
        private bookingsRepository: Repository<Booking>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(WalletTransaction)
        private walletTransactionsRepository: Repository<WalletTransaction>,
        private osrmService: OSRMService,
        private redis: RedisService,
    ) { }

    private async recordWalletTransaction(payload: {
        userId: string;
        type: WalletTransactionType;
        amount: number;
        description: string;
        direction?: 'credit' | 'debit' | null;
        rideId?: string | null;
        paymentReference?: string | null;
        metadata?: Record<string, any> | null;
    }) {
        const transaction = this.walletTransactionsRepository.create({
            userId: payload.userId,
            type: payload.type,
            amount: payload.amount,
            description: payload.description,
            direction: payload.direction ?? null,
            rideId: payload.rideId ?? null,
            paymentReference: payload.paymentReference ?? null,
            metadata: payload.metadata ?? null,
        });
        await this.walletTransactionsRepository.save(transaction);
    }

    private availableCacheKey(role: string, mode?: string) {
        return `rides:available:${role}:${mode ?? 'default'}`;
    }

    // Invalidate all "available rides" cache variants on any ride mutation.
    private async invalidateAvailableCache() {
        await this.redis.delPattern('rides:available:*');
    }

    private async setRideState(rideId: string, status: RideStatus) {
        await this.redis.setJson(`ride:request:${rideId}`, { status, updatedAt: Date.now() }, RIDE_STATE_TTL);
    }

    private getRiderOfferFloor(estimatedPrivateFare: number, isShared: boolean): number {
        if (!estimatedPrivateFare || estimatedPrivateFare <= 0) {
            return isShared ? 1200 : 3000;
        }
        if (isShared) {
            return Math.max(1200, Math.round((estimatedPrivateFare / 4.8) / 50) * 50);
        }
        return Math.max(2500, Math.round((estimatedPrivateFare * 0.82) / 50) * 50);
    }

    private enforcePassengerRequestFloor(data: any) {
        const isShared = Boolean(data?.preferences?.shared);
        const estimatedPrivateFare = Number(data?.tripFare ?? data?.estimatedPrivateFare ?? 0);
        const offeredFare = Number(data?.fare ?? data?.price ?? 0);
        const floor = this.getRiderOfferFloor(estimatedPrivateFare, isShared);

        if (offeredFare > 0 && offeredFare < floor) {
            throw new BadRequestException(
                `Offer is below floor price. Minimum for ${isShared ? 'shared' : 'private'} request is ${floor}.`
            );
        }
    }

    private readonly immediateRideStatuses = [
        RideStatus.SEARCHING,
        RideStatus.ACCEPTED,
        RideStatus.ARRIVED,
        RideStatus.IN_PROGRESS,
    ];

    private isFutureReservation(departureTime?: Date | string | null) {
        if (!departureTime) return false;
        const ts = new Date(departureTime).getTime();
        if (!ts) return false;
        return ts > Date.now() + 30 * 60 * 1000; // 30 minutes buffer
    }

    private async assertNoImmediateRideConflict(userId: string, role: 'driver' | 'passenger', excludeRideId?: string) {
        const query = this.ridesRepository.createQueryBuilder('ride')
            .where('ride.status IN (:...statuses)', { statuses: this.immediateRideStatuses })
            .andWhere('(ride.departureTime IS NULL OR ride.departureTime <= :now)', { now: new Date() })
            .andWhere(role === 'driver' ? 'ride.driverId = :userId' : 'ride.passengerId = :userId', { userId });

        if (excludeRideId) {
            query.andWhere('ride.id != :excludeRideId', { excludeRideId });
        }

        const existing = await query.getOne();
        if (!existing) return;

        const who = role === 'driver' ? 'Driver' : 'User';
        throw new BadRequestException(`${who} already has an active trip. Complete or cancel it before starting another immediate trip.`);
    }

    private sanitizePassengerForDriver(ride: Ride) {
        if (!ride?.passenger) return ride;
        const p = ride.passenger as any;
        // Build a safe plain object — avoids TypeORM class-instance spread issues
        // Expose only first name to protect passenger privacy
        const storedName: string = String(p.firstName || p.name || '').trim();
        const firstName = storedName.split(' ')[0] || p.email || p.phone || 'Passenger';
        const isActive = [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS].includes(ride.status);
        (ride as any).passenger = {
            id: p.id,
            firstName,
            lastName: '',
            email: isActive ? p.email : null,
            phone: isActive ? p.phone : null,
            rating: p.rating,
            avatarUrl: p.avatarUrl,
        };
        return ride;
    }

    private sanitizePassengerListForDriver(rides: Ride[]) {
        return rides.map((ride) => this.sanitizePassengerForDriver(ride));
    }

    async createRide(data: any): Promise<Ride> {
        if (data?.passengerId) {
            this.enforcePassengerRequestFloor(data);
            const passenger = await this.usersRepository.findOne({ where: { id: data.passengerId } });
            if (passenger?.isRestricted) {
                throw new ForbiddenException('Your account has been restricted. Contact support.');
            }
        }
        if (data?.driverId) {
            const driver = await this.usersRepository.findOne({ where: { id: data.driverId } });
            if (driver?.isRestricted) {
                throw new ForbiddenException('Your account has been restricted. Contact support.');
            }
            if ((driver?.pendingRemittance || 0) > 90000) {
                throw new ForbiddenException('Account suspended due to high outstanding remittance. Please pay your balance.');
            }
            if (data.paymentMethod === 'cash' && (driver?.pendingRemittance || 0) > 20000) {
                throw new ForbiddenException('You cannot create cash trips while your pending remittance is above ₦20,000.');
            }
        }
        const isFuture = this.isFutureReservation(data?.departureTime);
        if (!isFuture && data?.passengerId) {
            await this.assertNoImmediateRideConflict(data.passengerId, 'passenger');
        }
        if (!isFuture && data?.driverId) {
            await this.assertNoImmediateRideConflict(data.driverId, 'driver');
        }
        const seats = Number(data.seats) > 0 ? Number(data.seats) : 1;
        const fare = Number(data.fare ?? data.price ?? 0) || 0;
        const tripFare = Number(data.tripFare ?? fare) || fare;
        const distanceKm = Number(data.distanceKm ?? 0) || 0;
        const estimatedDurationMinutes = Number(data.estimatedDurationMinutes ?? data.duration ?? 0) || 0;

        const ride = this.ridesRepository.create({
            driverId: data.driverId,
            passengerId: data.passengerId,
            origin: data.origin,
            destination: data.destination,
            fare,
            tripFare,
            distanceKm,
            seats,
            availableSeats: data.availableSeats ?? seats,
            tier: data.tier ?? null,
            departureTime: data.departureTime ?? null,
            notes: data.notes ?? null,
            preferences: data.preferences ?? null,
            autoAccept: Boolean(data.autoAccept),
            pickupLocation: data.pickupLocation ?? null,
            paymentMethod: data.paymentMethod ?? null,
            paymentStatus: data.paymentStatus ?? null,
            pricingScenario: data.pricingScenario ?? null,
            pricingBreakdown: data.pricingBreakdown ?? null,
            estimatedDurationMinutes,
            status: RideStatus.SEARCHING, // Hardcoded to prevent client manipulation
        } as Partial<Ride>);

        const savedRide = await this.ridesRepository.save(ride);
        const result = (await this.findRideById(savedRide.id)) as Ride;
        await this.setRideState(result.id, result.status);
        await this.invalidateAvailableCache();
        return result;
    }

    async findRideById(rideId: string): Promise<Ride | null> {
        const ride = await this.ridesRepository.findOne({
            where: { id: rideId },
            relations: ['driver', 'driver.driverProfile', 'passenger'],
        });
        if (ride?.driver) {
            // Ensure rating never shows as 0 — new drivers default to 5.0
            if (!Number(ride.driver.rating)) {
                (ride.driver as any).rating = 5.0;
            }
        }
        return ride;
    }

    async acceptRide(rideId: string, driverId: string): Promise<Ride> {
        // .findOne returns 'Ride | null'. We must check for null.
        const driver = await this.usersRepository.findOne({ where: { id: driverId } });
        if (!driver) throw new NotFoundException('Driver not found');
        if (driver.isRestricted) {
            throw new ForbiddenException('Your account has been restricted. Contact support.');
        }
        if (driver.verificationStatus !== 'approved') {
            throw new ForbiddenException('Your account must be verified before accepting rides.');
        }
        
        if ((driver.pendingRemittance || 0) > 90000) {
            throw new ForbiddenException('Account suspended due to high outstanding remittance. Please pay your balance.');
        }

        const lockKey = `ride_lock:${rideId}`;
        const acquired = await this.redis.acquireLock(lockKey, 5);
        if (!acquired) {
            throw new BadRequestException('Ride is currently being accepted by another driver.');
        }

        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });
        if (!ride) {
            await this.redis.del(lockKey);
            throw new NotFoundException('Ride not found');
        }
        if (ride.status !== RideStatus.SEARCHING) {
            await this.redis.del(lockKey);
            throw new BadRequestException('Ride no longer available');
        }

        if (ride.paymentMethod === 'cash' && (driver.pendingRemittance || 0) > 20000) {
            throw new ForbiddenException('You cannot accept cash trips while your pending remittance is above ₦20,000.');
        }

        if (ride.passengerId && ride.passengerId === driverId) {
            throw new ForbiddenException('You cannot accept your own ride request.');
        }
        if (!this.isFutureReservation(ride.departureTime)) {
            await this.assertNoImmediateRideConflict(driverId, 'driver', ride.id);
            if (ride.passengerId) {
                await this.assertNoImmediateRideConflict(ride.passengerId, 'passenger', ride.id);
            }
        }

        ride.driverId = driverId;
        ride.status = RideStatus.ACCEPTED;
        await this.ridesRepository.save(ride);
        const result = this.sanitizePassengerForDriver((await this.findRideById(ride.id)) as Ride);
        await this.setRideState(result.id, RideStatus.ACCEPTED);
        await this.invalidateAvailableCache();
        return result;
    }

    async updateRideDetails(rideId: string, driverId: string, data: any): Promise<Ride> {
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });

        if (!ride) throw new NotFoundException('Ride not found');
        if (ride.driverId !== driverId) throw new ForbiddenException('You cannot edit this trip');
        if (ride.status !== RideStatus.SEARCHING) {
            throw new ForbiddenException('Only open trips can be edited');
        }

        const nextSeats = Number(data.seats ?? ride.seats) > 0 ? Number(data.seats ?? ride.seats) : ride.seats;

        Object.assign(ride, {
            origin: data.origin ?? ride.origin,
            destination: data.destination ?? ride.destination,
            departureTime: data.departureTime ?? ride.departureTime,
            fare: data.fare ?? data.price ?? ride.fare,
            tripFare: data.tripFare ?? ride.tripFare ?? data.fare ?? data.price ?? ride.fare,
            distanceKm: data.distanceKm ?? ride.distanceKm,
            tier: data.tier ?? ride.tier,
            seats: nextSeats,
            availableSeats: data.availableSeats ?? nextSeats,
            notes: data.notes ?? ride.notes,
            preferences: data.preferences ?? ride.preferences,
            autoAccept: typeof data.autoAccept === 'boolean' ? data.autoAccept : ride.autoAccept,
            pickupLocation: data.pickupLocation ?? ride.pickupLocation,
            paymentMethod: data.paymentMethod ?? ride.paymentMethod,
            paymentStatus: data.paymentStatus ?? ride.paymentStatus,
            pricingScenario: data.pricingScenario ?? ride.pricingScenario,
            pricingBreakdown: data.pricingBreakdown ?? ride.pricingBreakdown,
            estimatedDurationMinutes: data.estimatedDurationMinutes ?? data.duration ?? ride.estimatedDurationMinutes,
        });

        await this.ridesRepository.save(ride);
        const result = (await this.findRideById(ride.id)) as Ride;
        await this.invalidateAvailableCache();
        return result;
    }

    async updatePassengerRequestDetails(rideId: string, passengerId: string, data: any): Promise<Ride> {
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });

        if (!ride) throw new NotFoundException('Ride not found');
        if (ride.passengerId !== passengerId) throw new ForbiddenException('You cannot edit this request');
        if (ride.status !== RideStatus.SEARCHING) {
            throw new ForbiddenException('Only active requests can be edited');
        }

        this.enforcePassengerRequestFloor({
            ...ride,
            ...data,
            tripFare: data?.tripFare ?? ride.tripFare,
            preferences: { ...(ride.preferences || {}), ...(data.preferences || {}) },
        });

        Object.assign(ride, {
            fare: data.fare ?? data.price ?? ride.fare,
            tripFare: data.tripFare ?? ride.tripFare ?? data.fare ?? data.price ?? ride.fare,
            notes: data.notes ?? ride.notes,
            preferences: data.preferences ?? ride.preferences,
            departureTime: data.departureTime ?? ride.departureTime,
            origin: data.origin ?? ride.origin,
            destination: data.destination ?? ride.destination,
            estimatedDurationMinutes: data.estimatedDurationMinutes ?? data.duration ?? ride.estimatedDurationMinutes,
        });

        await this.ridesRepository.save(ride);
        const result = (await this.findRideById(ride.id)) as Ride;
        await this.invalidateAvailableCache();
        return result;
    }

    /**
     * Derive payment status server-side from the payment method.
     * Never trust client-supplied paymentStatus.
     */
    private derivePaymentStatus(paymentMethod: string): string {
        switch (paymentMethod) {
            case 'card':   return 'pending';              // Webhook / verify will mark paid
            case 'transfer': return 'pending_verification'; // Admin / reconciliation confirms
            case 'cash':
            default:       return 'pending';              // Collected at pickup
        }
    }

    async bookPublishedTrip(rideId: string, passengerId: string, data: any): Promise<Ride> {
        // Prevent duplicate bookings by the same passenger on the same trip
        const existingBooking = await this.bookingsRepository.findOne({
            where: { rideId, passengerId, status: BookingStatus.CONFIRMED },
        });
        if (existingBooking) {
            throw new BadRequestException('You already have a booking on this trip');
        }

        // Atomic seat decrement: only succeeds if availableSeats > 0 right now.
        // This prevents two simultaneous bookings from both reading seats=1 and both decrementing.
        const result = await this.ridesRepository
            .createQueryBuilder()
            .update()
            .set({ availableSeats: () => '"availableSeats" - 1' })
            .where('id = :rideId', { rideId })
            .andWhere('"availableSeats" > 0')
            .andWhere('status = :status', { status: RideStatus.SEARCHING })
            .andWhere('"driverId" IS NOT NULL')
            .execute();

        if (!result.affected || result.affected === 0) {
            // Check why — give a precise error
            const ride = await this.ridesRepository.findOne({ where: { id: rideId } });
            if (!ride) throw new NotFoundException('Trip not found');
            if (!ride.driverId) throw new BadRequestException('This trip is not available for booking');
            if (ride.availableSeats <= 0) throw new BadRequestException('No seats available on this trip');
            throw new BadRequestException('Trip is no longer accepting bookings');
        }

        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });
        if (!ride) throw new NotFoundException('Trip not found');

        if (!this.isFutureReservation(ride.departureTime)) {
            await this.assertNoImmediateRideConflict(passengerId, 'passenger', ride.id);
        }

        // Server-side payment status -- never trust client for cash, but webhook can override
        const paymentMethod = data.paymentMethod ?? 'cash';
        const paymentStatus = data.paymentStatus ?? this.derivePaymentStatus(paymentMethod);

        // Create a Booking record so every passenger is tracked individually
        const booking = this.bookingsRepository.create({
            rideId: ride.id,
            passengerId,
            seatsBooked: 1,
            pickupLocation: data.pickupLocation ?? ride.pickupLocation ?? ride.origin,
            paymentMethod,
            paymentStatus,
            fareCharged: Number(ride.fare || ride.tripFare || 0),
        });
        await this.bookingsRepository.save(booking);

        // Backward-compat: set passengerId on ride only if it's the first booking
        if (!ride.passengerId) {
            ride.passengerId = passengerId;
        }

        ride.pickupLocation = data.pickupLocation ?? ride.pickupLocation ?? ride.origin;
        ride.estimatedDurationMinutes = data.estimatedDurationMinutes ?? data.duration ?? ride.estimatedDurationMinutes ?? null;

        // Keep ride SEARCHING while seats remain so others can still book.
        // Transition to ACCEPTED only when every seat is taken.
        if (ride.availableSeats <= 0) {
            ride.status = RideStatus.ACCEPTED;
            await this.setRideState(ride.id, RideStatus.ACCEPTED);
        }

        await this.ridesRepository.save(ride);

        // If payment is already confirmed (e.g. from webhook), process the wallet transactions
        if (paymentStatus === 'paid') {
            await this.updatePaymentDetails(rideId, 'paid', {
                driverNetEarnings: data.driverNetEarnings,
                platformCut: data.platformCut,
                platformCutPercent: data.platformCutPercent,
                insuranceReserveAmount: data.insuranceReserveAmount,
                insuranceReservePercent: data.insuranceReservePercent,
                paystackReference: data.paystackReference,
                paymentReference: data.paymentReference,
                estimatedDurationMinutes: ride.estimatedDurationMinutes,
            });
        }

        const booked = (await this.findRideById(ride.id)) as Ride;
        await this.invalidateAvailableCache();
        return booked;
    }

    // Valid status transitions per actor
    private readonly driverTransitions: Partial<Record<RideStatus, RideStatus[]>> = {
        // Driver can close bookings on a published trip and begin the ride
        [RideStatus.SEARCHING]: [RideStatus.ACCEPTED, RideStatus.CANCELLED],
        [RideStatus.ACCEPTED]: [RideStatus.ARRIVED, RideStatus.CANCELLED],
        [RideStatus.ARRIVED]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
        [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED],
    };

    private readonly passengerTransitions: Partial<Record<RideStatus, RideStatus[]>> = {
        [RideStatus.SEARCHING]: [RideStatus.CANCELLED],
        [RideStatus.ACCEPTED]: [RideStatus.CANCELLED],
    };

    // Removed updateStatus to prevent auth bypass. Callers must use updateStatusAsActor.

    async updateStatusAsActor(rideId: string, userId: string, status: RideStatus): Promise<Ride> {
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });
        if (!ride) throw new NotFoundException('Ride not found');

        const isDriver = ride.driverId === userId;
        let isPassenger = ride.passengerId === userId;

        if (!isDriver && !isPassenger) {
            const booking = await this.bookingsRepository.findOne({ where: { rideId, passengerId: userId, status: BookingStatus.CONFIRMED } });
            if (booking) {
                isPassenger = true;
            } else {
                throw new ForbiddenException('You are not part of this ride');
            }
        }

        const allowed = isDriver
            ? this.driverTransitions[ride.status] ?? []
            : this.passengerTransitions[ride.status] ?? [];

        if (!allowed.includes(status)) {
            throw new BadRequestException(
                `Cannot transition from ${ride.status} to ${status}`,
            );
        }

        ride.status = status;
        await this.ridesRepository.save(ride);

        if (status === RideStatus.COMPLETED && ride.paymentMethod === 'cash' && ride.paymentStatus !== 'paid') {
            let platformCutPercent = ride.estimatedDurationMinutes && ride.estimatedDurationMinutes > 60 ? 15 : 12;
            try {
                const settingsUser = await this.usersRepository.findOne({ where: { email: '__settings__' } });
                if (settingsUser && (settingsUser.preferences as any)?.platformCutPercent) {
                    platformCutPercent = (settingsUser.preferences as any).platformCutPercent;
                }
            } catch (e) {}
            const amount = Number(ride.tripFare || ride.fare || 0);
            const platformCutAmount = Number(((amount * platformCutPercent) / 100).toFixed(2));
            const insuranceReserveAmount = Number(((amount * 2) / 100).toFixed(2));
            const driverNetEarnings = Number((amount - platformCutAmount - insuranceReserveAmount).toFixed(2));

            await this.updatePaymentDetails(rideId, 'paid', {
                platformCutPercent,
                insuranceReservePercent: 2,
                platformCut: platformCutAmount,
                insuranceReserveAmount,
                driverNetEarnings
            });
        }

        // Dispatch route calculation asynchronously when the driver starts the trip.
        // Non-blocking — failures are logged but don't fail the status update.
        if (status === RideStatus.IN_PROGRESS && ride.origin?.lat && ride.destination?.lat) {
            this.osrmService.getRoute(
                { lat: ride.origin.lat, lon: ride.origin.lon },
                { lat: ride.destination.lat, lon: ride.destination.lon },
            ).then((route) => {
                if (route) {
                    this.ridesRepository.update(rideId, {
                        distanceKm: route.distance / 1000,
                    });
                }
            }).catch((err) => {
                this.logger.warn(`OSRM route calculation failed for ride ${rideId}: ${err.message}`);
            });
        }

        const updated = (await this.findRideById(rideId)) as Ride;
        await this.setRideState(rideId, status);
        if ([RideStatus.COMPLETED, RideStatus.CANCELLED].includes(status)) {
            await this.invalidateAvailableCache();
        }
        return updated;
    }

    async cancelRideAsActor(rideId: string, userId: string): Promise<Ride> {
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });
        if (!ride) throw new NotFoundException('Ride not found');

        const isDriver = ride.driverId === userId;
        const isMainPassenger = ride.passengerId === userId;
        const booking = await this.bookingsRepository.findOne({ where: { rideId, passengerId: userId, status: BookingStatus.CONFIRMED } });
        const isBookingPassenger = !!booking;

        if (!isDriver && !isMainPassenger && !isBookingPassenger) {
            throw new ForbiddenException('You are not part of this ride');
        }

        const cancellableStatuses = [RideStatus.SEARCHING, RideStatus.ACCEPTED, RideStatus.ARRIVED];
        if (!cancellableStatuses.includes(ride.status)) {
            throw new BadRequestException(`Cannot cancel a ride that is ${ride.status}`);
        }

        if (isDriver || isMainPassenger) {
            ride.status = RideStatus.CANCELLED;
            await this.ridesRepository.save(ride);
            
            await this.bookingsRepository.update({ rideId }, { status: BookingStatus.CANCELLED });
            await this.setRideState(rideId, RideStatus.CANCELLED);
        } else if (booking) {
            booking.status = BookingStatus.CANCELLED;
            await this.bookingsRepository.save(booking);
            
            ride.availableSeats += booking.seatsBooked;
            if (ride.status === RideStatus.ACCEPTED && ride.availableSeats > 0) {
                ride.status = RideStatus.SEARCHING;
                await this.setRideState(rideId, RideStatus.SEARCHING);
            }
            await this.ridesRepository.save(ride);
        }

        const result = (await this.findRideById(rideId)) as Ride;
        await this.invalidateAvailableCache();
        return result;
    }

    async updatePaymentDetails(
        rideId: string,
        status: string,
        details?: {
            driverNetEarnings?: number;
            platformCut?: number;
            platformCutPercent?: number;
            insuranceReserveAmount?: number;
            insuranceReservePercent?: number;
            paystackReference?: string;
            paymentReference?: string;
            estimatedDurationMinutes?: number;
        },
    ): Promise<Ride> {
        const ride = await this.ridesRepository.findOne({ where: { id: rideId }, relations: ['driver'] });
        if (!ride) throw new NotFoundException('Ride not found');

        // Guard against double-payment
        if (ride.paymentStatus === 'paid') {
            return ride;
        }

        // Validate the total paid amount is within 1% of the recorded fare
        if (status === 'paid' && ride.tripFare != null && ride.tripFare > 0) {
            const totalPaid = Number(details?.driverNetEarnings || 0) + Number(details?.platformCut || 0) + Number(details?.insuranceReserveAmount || 0);
            const recordedFare = Number(ride.tripFare);
            const tolerance = recordedFare * 0.01;
            if (Math.abs(totalPaid - recordedFare) > Math.max(tolerance, 1)) {
                throw new BadRequestException(`Payment amount ₦${totalPaid} does not match ride fare ₦${recordedFare}`);
            }
        }

        ride.paymentStatus = status;
        if (details?.driverNetEarnings !== undefined) {
            ride.driverEarnings = details.driverNetEarnings;
            ride.driverNetEarnings = details.driverNetEarnings;
        }
        if (details?.platformCut !== undefined) {
            ride.platformCut = details.platformCut;
            ride.platformCutAmount = details.platformCut;
        }
        if (details?.platformCutPercent !== undefined) ride.platformCutPercent = details.platformCutPercent;
        if (details?.insuranceReserveAmount !== undefined) ride.insuranceReserveAmount = details.insuranceReserveAmount;
        if (details?.insuranceReservePercent !== undefined) ride.insuranceReservePercent = details.insuranceReservePercent;
        if (details?.paystackReference) ride.paystackReference = details.paystackReference;
        if (details?.paymentReference) ride.paymentReference = details.paymentReference;
        if (details?.estimatedDurationMinutes !== undefined) ride.estimatedDurationMinutes = details.estimatedDurationMinutes;
        if (!ride.paymentReference && ride.paystackReference) ride.paymentReference = ride.paystackReference;
        ride.payoutStatus = ride.paymentMethod === 'cash' ? 'cash_collected' : status === 'paid' ? 'earnings_allocated' : ride.payoutStatus;

        const savedRide = await this.ridesRepository.save(ride);

        if (status === 'paid' && ride.driver) {
            const queryRunner = this.ridesRepository.manager.connection.createQueryRunner();
            await queryRunner.startTransaction();
            try {
            // [SECURITY] Fetch user with pessimistic_write lock to ensure atomicity of balance/remittance updates
            const driver = await queryRunner.manager.findOne(User, {
                where: { id: ride.driverId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!driver) throw new Error('Driver not found for payment allocation');

            const isCash = ride.paymentMethod === 'cash';
            const grossFare = Number(ride.tripFare || 0);
            const platformCut = Number(ride.platformCutAmount ?? ride.platformCut ?? 0);
            const insuranceReserveAmount = Number(ride.insuranceReserveAmount || 0);
            const driverNetEarnings = Number(ride.driverNetEarnings ?? ride.driverEarnings ?? 0);
            const paymentReference = ride.paymentReference || ride.paystackReference || `trip-${ride.id}`;

            if (isCash) {
                const totalDue = platformCut + insuranceReserveAmount;
                if (totalDue > 0) {
                    driver.pendingRemittance = Number(driver.pendingRemittance || 0) + totalDue;
                    const txn = queryRunner.manager.create(WalletTransaction, {
                        userId: ride.driverId,
                        type: 'remittance_due',
                        amount: totalDue,
                        direction: 'debit',
                        description: `Cash trip remittance due for trip ${ride.id.slice(0, 8)}`,
                        rideId: ride.id,
                        paymentReference,
                        metadata: { grossFare, platformCut, insuranceReserveAmount, tripId: ride.id },
                    });
                    await queryRunner.manager.save(WalletTransaction, txn);
                }
            } else {
                if (driverNetEarnings > 0) {
                    driver.balance = Number(driver.balance || 0) + driverNetEarnings;
                }
            }
            
            // Persist the updated financial state within the transaction
            await queryRunner.manager.save(driver);

            const passengerPaymentTxn = queryRunner.manager.create(WalletTransaction, {
                userId: ride.driverId,
                type: 'passenger_payment',
                amount: grossFare,
                direction: 'credit',
                description: `Passenger paid for trip ${ride.id.slice(0, 8)}`,
                rideId: ride.id,
                paymentReference,
                metadata: { grossFare, platformCut, insuranceReserveAmount, driverNetEarnings, payoutStatus: ride.payoutStatus, tripId: ride.id },
            });
            await queryRunner.manager.save(WalletTransaction, passengerPaymentTxn);

            if (driverNetEarnings > 0) {
                const driverEarningTxn = queryRunner.manager.create(WalletTransaction, {
                    userId: ride.driverId,
                    type: 'driver_earning',
                    amount: driverNetEarnings,
                    direction: 'credit',
                    description: `Driver earnings allocated for trip ${ride.id.slice(0, 8)}`,
                    rideId: ride.id,
                    paymentReference,
                    metadata: { grossFare, platformCut, insuranceReserveAmount, tripId: ride.id },
                });
                await queryRunner.manager.save(WalletTransaction, driverEarningTxn);
            }

            if (insuranceReserveAmount > 0) {
                const insuranceReserveTxn = queryRunner.manager.create(WalletTransaction, {
                    userId: ride.driverId,
                    type: 'insurance_reserve',
                    amount: insuranceReserveAmount,
                    direction: 'debit',
                    description: `Insurance reserve held for trip ${ride.id.slice(0, 8)}`,
                    rideId: ride.id,
                    paymentReference,
                    metadata: { grossFare, platformCut, driverNetEarnings, tripId: ride.id },
                });
                await queryRunner.manager.save(WalletTransaction, insuranceReserveTxn);
            }

            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to process wallet transaction for ride ${rideId}: ${err.message}`);
            throw new InternalServerErrorException('Failed to process payment records');
        } finally {
            await queryRunner.release();
        }
        } // close if (status === 'paid' && ride.driver)

        return savedRide;
    }

    async isPaymentReferenceProcessed(reference: string): Promise<boolean> {
        if (!reference) return false;
        const existingTxn = await this.walletTransactionsRepository.findOne({ where: { paymentReference: reference } });
        return !!existingTxn;
    }

    async processRemittancePayment(userId: string, amount: number, reference: string) {
        // [ATOMIC] Use transaction with write lock to ensure remittance is decremented safely
        await this.usersRepository.manager.transaction(async (em) => {
            const user = await em.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user) return;

            user.pendingRemittance = Math.max(0, Number(user.pendingRemittance || 0) - amount);
            await em.save(user);

            const txn = em.create(WalletTransaction, {
                userId,
                type: 'remittance_payment',
                amount,
                direction: 'credit',
                description: `Remittance payment via Paystack`,
                paymentReference: reference,
            });
            await em.save(txn);
        });
    }

    async markRefunded(rideId: string, refundReference: string, refundReason: string): Promise<Ride> {
        return await this.ridesRepository.manager.transaction(async (em) => {
            const ride = await em.findOne(Ride, { where: { id: rideId }, relations: ['driver'] });
            if (!ride) throw new NotFoundException('Ride not found');

            // [ATOMIC] Reversing driver earnings must be protected by a write lock
            if (ride.paymentMethod !== 'cash' && ride.driverEarnings && Number(ride.driverEarnings) > 0 && ride.driverId) {
                const driver = await em.findOne(User, {
                    where: { id: ride.driverId },
                    lock: { mode: 'pessimistic_write' },
                });
                if (driver) {
                    driver.balance = Math.max(0, Number(driver.balance || 0) - Number(ride.driverEarnings));
                    await em.save(driver);
                }
            }

            ride.paymentStatus = 'refunded';
            ride.refundReference = refundReference;
            ride.refundReason = refundReason;
            return await em.save(ride);
        });
    }

    async getActiveRides(userId: string, role: string) {
        const activeStatuses = [RideStatus.SEARCHING, RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS];

        const query = this.ridesRepository.createQueryBuilder('ride')
            .leftJoinAndSelect('ride.driver', 'driver')
            .leftJoinAndSelect('driver.driverProfile', 'driverProfile')
            .leftJoinAndSelect('ride.passenger', 'passenger')
            .where('ride.status IN (:...statuses)', { statuses: activeStatuses })
            .orderBy('ride.createdAt', 'DESC');

        if (role === 'driver') {
            query.andWhere('ride.driverId = :userId', { userId });
        } else {
            // Passenger: rides they created OR rides they booked a seat on
            query.andWhere(
                new Brackets((qb) => {
                    qb.where('ride.passengerId = :userId', { userId })
                      .orWhere(
                          `ride.id IN (SELECT "rideId" FROM bookings WHERE "passengerId" = :userId AND status != :cancelledStatus)`,
                          { userId, cancelledStatus: BookingStatus.CANCELLED },
                      );
                }),
            );
        }

        const rides = await query.getMany();

        if (role === 'driver') {
            return this.sanitizePassengerListForDriver(rides);
        }

        // For passengers who booked a published trip: if the ride is still SEARCHING,
        // present it as ACCEPTED so the frontend shows the correct "booked" state.
        if (role !== 'driver') {
            const bookedRideIds = new Set(
                (await this.bookingsRepository.find({
                    where: { passengerId: userId, status: BookingStatus.CONFIRMED },
                    select: ['rideId'],
                })).map((b) => b.rideId),
            );

            for (const ride of rides) {
                if (ride.status === RideStatus.SEARCHING && bookedRideIds.has(ride.id)) {
                    // Virtual override: the passenger already booked, show as ACCEPTED
                    (ride as any).status = RideStatus.ACCEPTED;
                }
            }
        }

        return rides;
    }

    async getAvailableRides(filters: any) {
        const cacheKey = this.availableCacheKey(filters.role ?? 'all', filters.mode);
        const cached = await this.redis.getJson<any[]>(cacheKey);
        if (cached) return cached;

        const query = this.ridesRepository.createQueryBuilder('ride')
            .leftJoinAndSelect('ride.passenger', 'passenger') // For passenger requests?
            .leftJoinAndSelect('ride.driver', 'driver')       // For driver posts?
            .where('ride.status = :status', { status: RideStatus.SEARCHING });

        // Driver app: show passenger ride requests awaiting a driver.
        if (filters.role === 'driver') {
            query
                .andWhere('ride.passengerId IS NOT NULL')
                .andWhere('ride.driverId IS NULL');
        }

        // Rider app: show routes published by drivers.
        if (filters.role === 'rider' || filters.mode === 'driver_routes') {
            query
                .andWhere('ride.driverId IS NOT NULL')
                .andWhere('ride.availableSeats > 0');
        }

        if (filters.tier) {
            query.andWhere('ride.tier = :tier', { tier: filters.tier });
        }

        const rides = await query.orderBy('ride.createdAt', 'DESC').getMany();
        const result = filters.role === 'driver'
            ? this.sanitizePassengerListForDriver(rides)
            : rides;

        await this.redis.setJson(cacheKey, result, AVAILABLE_RIDES_TTL);
        return result;
    }

    async getTrendingAreas(limit: number = 8) {
        const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(20, Number(limit))) : 8;
        const cacheKey = `rides:trending:${safeLimit}`;
        const cached = await this.redis.getJson<any[]>(cacheKey);
        if (cached) return cached;

        const rides = await this.ridesRepository.find({
            where: { updatedAt: MoreThanOrEqual(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) },
            order: { updatedAt: 'DESC' },
            take: 5000,
        });

        const result = buildTrendingAreas(rides, safeLimit);
        await this.redis.setJson(cacheKey, result, TRENDING_AREAS_TTL);
        return result;
    }

    async getHistory(userId: string, role: string, page: number = 1) {
        const take = 10;
        const skip = (page - 1) * take;

        const query = this.ridesRepository.createQueryBuilder('ride')
            .leftJoinAndSelect('ride.driver', 'driver')
            .leftJoinAndSelect('driver.driverProfile', 'driverProfile')
            .leftJoinAndSelect('ride.passenger', 'passenger')
            .where('ride.status IN (:...statuses)', { statuses: [RideStatus.COMPLETED, RideStatus.CANCELLED] })
            .orderBy('ride.createdAt', 'DESC')
            .take(take)
            .skip(skip);

        if (role === 'driver') {
            query.andWhere('ride.driverId = :userId', { userId });
        } else {
            // Also include rides where the passenger had a booking
            query.andWhere(
                new Brackets((qb) => {
                    qb.where('ride.passengerId = :userId', { userId })
                      .orWhere(
                          `ride.id IN (SELECT "rideId" FROM bookings WHERE "passengerId" = :userId)`,
                          { userId },
                      );
                }),
            );
        }

        const [rides, count] = await query.getManyAndCount();
        if (role === 'driver') {
            return [this.sanitizePassengerListForDriver(rides), count] as const;
        }
        return [rides, count] as const;
    }

    async isParticipant(rideId: string, userId: string): Promise<boolean> {
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });
        if (!ride) return false;
        if (ride.driverId === userId || ride.passengerId === userId) return true;
        const booking = await this.bookingsRepository.findOne({ where: { rideId, passengerId: userId, status: BookingStatus.CONFIRMED } });
        return !!booking;
    }

    async getParticipantIds(rideId: string): Promise<string[]> {
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });
        if (!ride) return [];
        const ids = new Set<string>();
        if (ride.driverId) ids.add(ride.driverId);
        if (ride.passengerId) ids.add(ride.passengerId);
        const bookings = await this.bookingsRepository.find({ where: { rideId, status: BookingStatus.CONFIRMED } });
        for (const b of bookings) ids.add(b.passengerId);
        return Array.from(ids);
    }
}
