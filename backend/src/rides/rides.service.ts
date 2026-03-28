import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride, RideStatus } from './ride.entity';
import { User } from '../users/user.entity';

@Injectable()
export class RidesService {
    constructor(
        @InjectRepository(Ride)
        private ridesRepository: Repository<Ride>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

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

    async createRide(data: any): Promise<Ride> {
        if (data?.passengerId) {
            this.enforcePassengerRequestFloor(data);
        }
        const seats = Number(data.seats) > 0 ? Number(data.seats) : 1;
        const fare = Number(data.fare ?? data.price ?? 0) || 0;
        const tripFare = Number(data.tripFare ?? fare) || fare;
        const distanceKm = Number(data.distanceKm ?? 0) || 0;

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
            status: data.status ?? RideStatus.SEARCHING,
        } as Partial<Ride>);

        const savedRide = await this.ridesRepository.save(ride);
        return (await this.findRideById(savedRide.id)) as Ride;
    }

    async findRideById(rideId: string): Promise<Ride | null> {
        return this.ridesRepository.findOne({
            where: { id: rideId },
            relations: ['driver', 'passenger'],
        });
    }

    async acceptRide(rideId: string, driverId: string): Promise<Ride> {
        // .findOne returns 'Ride | null'. We must check for null.
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });

        if (!ride) throw new NotFoundException('Ride not found'); // Use NestJS built-in exceptions
        if (ride.status !== RideStatus.SEARCHING) throw new BadRequestException('Ride no longer available');

        ride.driverId = driverId;
        ride.status = RideStatus.ACCEPTED;
        await this.ridesRepository.save(ride);
        return (await this.findRideById(ride.id)) as Ride;
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
        });

        await this.ridesRepository.save(ride);
        return (await this.findRideById(ride.id)) as Ride;
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
        });

        await this.ridesRepository.save(ride);
        return (await this.findRideById(ride.id)) as Ride;
    }

    async bookPublishedTrip(rideId: string, passengerId: string, data: any): Promise<Ride> {
        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });

        if (!ride) throw new NotFoundException('Trip not found');
        if (!ride.driverId) throw new BadRequestException('This trip is not available for booking');
        if (ride.availableSeats <= 0) throw new BadRequestException('No seats left on this trip');
        if (ride.passengerId && ride.passengerId !== passengerId) {
            throw new BadRequestException('This trip already has an active rider');
        }

        ride.passengerId = passengerId;
        ride.pickupLocation = data.pickupLocation ?? ride.pickupLocation ?? ride.origin;
        ride.paymentMethod = data.paymentMethod ?? ride.paymentMethod ?? 'cash';
        ride.paymentStatus = data.paymentStatus ?? 'pending';
        ride.availableSeats = Math.max((ride.availableSeats ?? 1) - 1, 0);
        ride.status = RideStatus.ACCEPTED;

        await this.ridesRepository.save(ride);
        return (await this.findRideById(ride.id)) as Ride;
    }

    async updateStatus(rideId: string, status: RideStatus): Promise<Ride> {
        await this.ridesRepository.update(rideId, { status });

        const ride = await this.ridesRepository.findOne({ where: { id: rideId } });

        if (!ride) {
            throw new NotFoundException('Ride not found');
        }

        return ride;
    }

    async updatePaymentDetails(rideId: string, status: string, driverEarnings?: number, platformCut?: number): Promise<Ride> {
        const ride = await this.ridesRepository.findOne({ where: { id: rideId }, relations: ['driver'] });
        if (!ride) throw new NotFoundException('Ride not found');

        ride.paymentStatus = status;
        if (driverEarnings !== undefined) ride.driverEarnings = driverEarnings;
        if (platformCut !== undefined) ride.platformCut = platformCut;

        const savedRide = await this.ridesRepository.save(ride);

        if (status === 'paid' && ride.driver) {
            await this.usersRepository.update(ride.driverId, {
                balance: () => `balance + ${driverEarnings || 0}`,
                pendingRemittance: () => `pendingRemittance + ${platformCut || 0}`
            });
        }

        return savedRide;
    }
    async getActiveRides(userId: string, role: string) {
        const query = this.ridesRepository.createQueryBuilder('ride')
            .leftJoinAndSelect('ride.driver', 'driver')
            .leftJoinAndSelect('ride.passenger', 'passenger')
            .where('ride.status IN (:...statuses)', { statuses: [RideStatus.SEARCHING, RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS] })
            .orderBy('ride.createdAt', 'DESC');

        if (role === 'driver') {
            query.andWhere('ride.driverId = :userId', { userId });
        } else {
            query.andWhere('ride.passengerId = :userId', { userId });
        }

        return query.getMany();
    }

    async getAvailableRides(filters: any) {
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

        return query.orderBy('ride.createdAt', 'DESC').getMany();
    }

    async getHistory(userId: string, role: string, page: number = 1) {
        const take = 10;
        const skip = (page - 1) * take;

        const query = this.ridesRepository.createQueryBuilder('ride')
            .leftJoinAndSelect('ride.driver', 'driver')
            .leftJoinAndSelect('ride.passenger', 'passenger')
            .where('ride.status IN (:...statuses)', { statuses: [RideStatus.COMPLETED, RideStatus.CANCELLED] })
            .orderBy('ride.createdAt', 'DESC')
            .take(take)
            .skip(skip);

        if (role === 'driver') {
            query.andWhere('ride.driverId = :userId', { userId });
        } else {
            query.andWhere('ride.passengerId = :userId', { userId });
        }

        return query.getManyAndCount();
    }
}
