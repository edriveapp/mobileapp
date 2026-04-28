import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PushNotificationsService } from '../common/push-notifications.service';
import { RedisService } from '../common/redis.service';
import { UsersService } from '../users/users.service';
import { RidesService } from './rides.service';

@WebSocketGateway({
    cors: {
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()) : false,
        credentials: true,
    },
})
export class RidesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private ridesService: RidesService,
        private redisService: RedisService,
        private usersService: UsersService,
        private pushNotificationsService: PushNotificationsService,
        private jwtService: JwtService,
    ) { }

    private extractSocketUser(client: Socket): { userId: string; role: string } | null {
        try {
            const token =
                (client.handshake.auth as any)?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) return null;
            const payload = this.jwtService.verify(token) as any;
            return { userId: payload.sub, role: payload.role };
        } catch {
            return null;
        }
    }

    private sanitizeRideForDriver(ride: any) {
        if (!ride?.passenger) return ride;
        const p = ride.passenger;
        // Build a safe plain object — avoids TypeORM class-instance spread issues
        // Expose only first name to protect passenger privacy
        const storedName: string = String(p.firstName || p.name || '').trim();
        const firstName = storedName.split(' ')[0] || p.email || p.phone || 'Passenger';
        const isActive = ['accepted', 'arrived', 'in_progress'].includes(ride.status);
        const passenger = {
            id: p.id,
            firstName,
            lastName: '',
            email: isActive ? p.email : null,
            phone: isActive ? p.phone : null,
            rating: p.rating,
            avatarUrl: p.avatarUrl,
        };
        return { ...ride, passenger };
    }

    private verifySocketUser(client: Socket): boolean {
        const user = this.extractSocketUser(client);
        return user !== null && user.userId === client.data.userId;
    }

    handleConnection(client: Socket) {
        const user = this.extractSocketUser(client);
        if (!user) {
            client.disconnect(true);
            return;
        }
        client.data.userId = user.userId;
        client.data.role = user.role;
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('update_location')
    async handleLocationUpdate(
        @MessageBody() data: { lat: number; lon: number },
        @ConnectedSocket() client: Socket,
    ) {
        const driverId = client.data.userId;
        if (!driverId || client.data.role !== 'driver') return;
        await this.redisService.setDriverLocation(driverId, data.lat, data.lon);

        // Never trust client-supplied rideId. Find active rides for driver.
        const activeRides = await this.ridesService.getActiveRides(driverId, 'driver');
        if (activeRides && activeRides.length > 0) {
            for (const ride of activeRides) {
                if (ride.passengerId) {
                    this.server.to(`user_${ride.passengerId}`).emit('driver_location_update', {
                        lat: data.lat,
                        lon: data.lon,
                        rideId: ride.id,
                    });
                }
            }
        }
    }

    @SubscribeMessage('request_ride')
    async handleRequestRide(
        @MessageBody() data: { passengerId: string; origin: any; destination: any; tier: string },
        @ConnectedSocket() client: Socket,
    ) {
        if (!client.data.userId || !this.verifySocketUser(client)) {
            client.disconnect(true);
            return;
        }
        
        // 1. Create Ride in DB via Service
        const ride = await this.ridesService.createRide({ ...data, passengerId: client.data.userId });

        // 2. Find nearby drivers (Redis) - Cap to 50 drivers max for broadcast
        const nearbyDriverIds = (await this.redisService.getNearbyDrivers(data.origin.lat, data.origin.lon, 5)).slice(0, 50);

        // 3. Emit to drivers with ACK support using a reliable queue in production
        nearbyDriverIds.forEach(driverId => {
            this.server.to(`driver_${driverId}`).emit('ride_request', ride);
        });

        return { event: 'ride_requested', data: ride };
    }

    @SubscribeMessage('join_driver_room')
    handleJoinDriverRoom(@ConnectedSocket() client: Socket) {
        const userId = client.data.userId;
        if (!userId) return;
        if (client.data.role !== 'driver') {
            client.disconnect(true);
            return;
        }
        client.join(`driver_${userId}`);
        client.join('drivers');
    }

    @SubscribeMessage('join_user_room')
    handleJoinUserRoom(@ConnectedSocket() client: Socket) {
        const userId = client.data.userId;
        if (!userId) return;
        client.join(`user_${userId}`);
    }

    async broadcastNewRideRequest(ride: any) {
        const safeRide = this.sanitizeRideForDriver(ride);

        if (!ride.origin?.lat || !ride.origin?.lon) return;

        const nearbyDriverIds = await this.redisService.getNearbyDrivers(ride.origin.lat, ride.origin.lon, 15);

        // Only emit to drivers who are actually nearby — no global fallback
        nearbyDriverIds.forEach((driverId) => {
            this.server.to(`driver_${driverId}`).emit('ride_request', safeRide);
        });

        if (nearbyDriverIds.length > 0) {
            const pushLock = `push_lock:new_ride:${ride.id}`;
            if (await this.redisService.acquireLock(pushLock, 60)) {
                const driverTokens = await this.usersService.getPushTokensForUsers(nearbyDriverIds);
                await this.pushNotificationsService.sendToExpoTokens(
                    driverTokens,
                    'New rider request',
                    `${ride.origin?.address || 'A rider'} → ${ride.destination?.address || 'Destination'}`,
                    { type: 'ride_request', rideId: ride.id },
                    'default',
                );
            }
        }
    }

    async broadcastRideAccepted(ride: any) {
        this.server.to(`user_${ride.passengerId}`).emit('driver_accepted', ride);

        const pushLock = `push_lock:accepted:${ride.id}`;
        if (await this.redisService.acquireLock(pushLock, 60)) {
            const riderTokens = await this.usersService.getPushTokensForUser(ride.passengerId);
            await this.pushNotificationsService.sendToExpoTokens(
                riderTokens,
                'Driver accepted your trip',
                'Your ride request has been accepted. Chat is now open.',
                { type: 'ride_accepted', rideId: ride.id },
                'default',
            );
        }
    }

    async broadcastRideStatusUpdate(ride: any) {
        // Emit to passenger (full data)
        if (ride.passengerId) {
            this.server.to(`user_${ride.passengerId}`).emit('ride_status_update', ride);
        }
        // Emit to driver (first name only)
        if (ride.driverId) {
            this.server.to(`driver_${ride.driverId}`).emit('ride_status_update', this.sanitizeRideForDriver(ride));
        }

        // Push notification for key status changes
        if (ride.status === 'arrived' && ride.passengerId) {
            const pushLock = `push_lock:arrived:${ride.id}`;
            if (await this.redisService.acquireLock(pushLock, 60)) {
                const tokens = await this.usersService.getPushTokensForUser(ride.passengerId);
                await this.pushNotificationsService.sendToExpoTokens(
                    tokens,
                    'Driver Arrived',
                    'Your driver has arrived at the pickup location.',
                    { type: 'ride_status', status: 'arrived', rideId: ride.id },
                );
            }
        }
    }

    async broadcastRideRequestUpdated(ride: any) {
        const safeRide = this.sanitizeRideForDriver(ride);

        if (ride.origin?.lat && ride.origin?.lon) {
            const nearbyDriverIds = await this.redisService.getNearbyDrivers(ride.origin.lat, ride.origin.lon, 15);
            nearbyDriverIds.forEach((driverId) => {
                this.server.to(`driver_${driverId}`).emit('ride_request_updated', safeRide);
            });
        }

        if (ride.passengerId) {
            this.server.to(`user_${ride.passengerId}`).emit('ride_request_updated', ride);
        }
    }

    async broadcastTripBooked(ride: any) {
        const safeRide = this.sanitizeRideForDriver(ride);
        this.server.to(`driver_${ride.driverId}`).emit('trip_booked', safeRide);

        const pushLock = `push_lock:trip_booked:${ride.id}`;
        if (await this.redisService.acquireLock(pushLock, 60)) {
            const driverTokens = await this.usersService.getPushTokensForUser(ride.driverId);
            await this.pushNotificationsService.sendToExpoTokens(
                driverTokens,
                'New trip booking',
                `${ride.passenger?.firstName || ride.passenger?.email || 'A rider'} booked ${ride.origin?.address || 'your trip'}`,
                { type: 'trip_booked', rideId: ride.id },
                'default',
            );
        }
    }

    @SubscribeMessage('accept_ride')
    async handleAcceptRide(
        @MessageBody() data: { rideId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const driverId = client.data.userId;
        if (!driverId || client.data.role !== 'driver' || !this.verifySocketUser(client)) {
            client.disconnect(true);
            return;
        }
        const updatedRide = await this.ridesService.acceptRide(data.rideId, driverId);
        await this.broadcastRideAccepted(updatedRide);

        return updatedRide;
    }
}
