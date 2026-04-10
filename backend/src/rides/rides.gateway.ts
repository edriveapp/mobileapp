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
        const passenger = {
            id: p.id,
            firstName,
            lastName: '',
            email: p.email,
            phone: p.phone,
            rating: p.rating,
            avatarUrl: p.avatarUrl,
        };
        return { ...ride, passenger };
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
        @MessageBody() data: { rideId?: string; lat: number; lon: number },
        @ConnectedSocket() client: Socket,
    ) {
        const driverId = client.data.userId;
        if (!driverId) return;
        await this.redisService.setDriverLocation(driverId, data.lat, data.lon);

        // Resolve passengerId from the ride in DB — never trust client-supplied IDs
        if (data.rideId) {
            const ride = await this.ridesService.findRideById(data.rideId);
            if (ride?.driverId === driverId && ride.passengerId) {
                this.server.to(`user_${ride.passengerId}`).emit('driver_location_update', {
                    lat: data.lat,
                    lon: data.lon,
                    rideId: data.rideId,
                });
            }
        }
    }

    @SubscribeMessage('request_ride')
    async handleRequestRide(
        @MessageBody() data: { passengerId: string; origin: any; destination: any; tier: string },
        @ConnectedSocket() client: Socket,
    ) {
        // 1. Create Ride in DB via Service
        const ride = await this.ridesService.createRide(data);

        // 2. Find nearby drivers (Redis)
        const nearbyDriverIds = await this.redisService.getNearbyDrivers(data.origin.lat, data.origin.lon, 5); // 5km radius

        // 3. Emit to drivers
        // In a real app, map driverIds to socketIds. For MVP, broadcast or use rooms.
        // simpler: join drivers to a 'drivers' room based on geohash or city
        // For now, emit to all connected drivers? No, that's bad.
        // Assuming driver joins room `driver_${driverId}` on connection.
        nearbyDriverIds.forEach(driverId => {
            this.server.to(`driver_${driverId}`).emit('ride_request', ride);
        });

        return { event: 'ride_requested', data: ride };
    }

    @SubscribeMessage('join_driver_room')
    handleJoinDriverRoom(@ConnectedSocket() client: Socket) {
        const userId = client.data.userId;
        if (!userId) return;
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

    async broadcastRideAccepted(ride: any) {
        this.server.to(`user_${ride.passengerId}`).emit('driver_accepted', ride);

        const riderTokens = await this.usersService.getPushTokensForUser(ride.passengerId);
        await this.pushNotificationsService.sendToExpoTokens(
            riderTokens,
            'Driver accepted your trip',
            'Your ride request has been accepted. Chat is now open.',
            { type: 'ride_accepted', rideId: ride.id },
            'default',
        );
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
            const tokens = await this.usersService.getPushTokensForUser(ride.passengerId);
            await this.pushNotificationsService.sendToExpoTokens(
                tokens,
                'Driver Arrived',
                'Your driver has arrived at the pickup location.',
                { type: 'ride_status', status: 'arrived', rideId: ride.id },
            );
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

        const driverTokens = await this.usersService.getPushTokensForUser(ride.driverId);
        await this.pushNotificationsService.sendToExpoTokens(
            driverTokens,
            'New trip booking',
            `${ride.passenger?.firstName || ride.passenger?.email || 'A rider'} booked ${ride.origin?.address || 'your trip'}`,
            { type: 'trip_booked', rideId: ride.id },
            'default',
        );
    }

    @SubscribeMessage('accept_ride')
    async handleAcceptRide(
        @MessageBody() data: { rideId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const driverId = client.data.userId;
        if (!driverId) return;
        const updatedRide = await this.ridesService.acceptRide(data.rideId, driverId);
        await this.broadcastRideAccepted(updatedRide);

        return updatedRide;
    }
}
