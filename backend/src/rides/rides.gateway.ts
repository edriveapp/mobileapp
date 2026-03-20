import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PushNotificationsService } from '../common/push-notifications.service';
import { RedisService } from '../common/redis.service';
import { UsersService } from '../users/users.service';
import { RidesService } from './rides.service';

@WebSocketGateway({ cors: true })
export class RidesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private ridesService: RidesService,
        private redisService: RedisService,
        private usersService: UsersService,
        private pushNotificationsService: PushNotificationsService,
    ) { }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
        // In production, validate token here
        // const token = client.handshake.auth.token;
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('update_location')
    async handleLocationUpdate(
        @MessageBody() data: { driverId: string; lat: number; lon: number },
        @ConnectedSocket() client: Socket,
    ) {
        await this.redisService.setDriverLocation(data.driverId, data.lat, data.lon);
        // Optionally broadcast to passengers tracking this driver
        // this.server.to(`ride_${rideId}`).emit('location_update', data);
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
    handleJoinDriverRoom(@MessageBody() driverId: string, @ConnectedSocket() client: Socket) {
        client.join(`driver_${driverId}`);
        client.join('drivers');
    }

    @SubscribeMessage('join_user_room')
    handleJoinUserRoom(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        client.join(`user_${userId}`);
    }

    async broadcastNewRideRequest(ride: any) {
        const nearbyDriverIds = ride.origin?.lat && ride.origin?.lon
            ? await this.redisService.getNearbyDrivers(ride.origin.lat, ride.origin.lon, 15)
            : [];

        if (nearbyDriverIds.length) {
            nearbyDriverIds.forEach((driverId) => {
                this.server.to(`driver_${driverId}`).emit('ride_request', ride);
            });
        } else {
            this.server.to('drivers').emit('ride_request', ride);
        }

        const driverTokens = await this.usersService.getPushTokensForRole('driver' as any);
        await this.pushNotificationsService.sendToExpoTokens(
            driverTokens,
            'New rider request',
            `${ride.origin?.address || 'A rider'} -> ${ride.destination?.address || 'Destination'}`,
            { type: 'ride_request', rideId: ride.id },
            'default',
        );
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

    async broadcastRideRequestUpdated(ride: any) {
        const nearbyDriverIds = ride.origin?.lat && ride.origin?.lon
            ? await this.redisService.getNearbyDrivers(ride.origin.lat, ride.origin.lon, 15)
            : [];

        if (nearbyDriverIds.length) {
            nearbyDriverIds.forEach((driverId) => {
                this.server.to(`driver_${driverId}`).emit('ride_request_updated', ride);
            });
        } else {
            this.server.to('drivers').emit('ride_request_updated', ride);
        }

        this.server.to(`user_${ride.passengerId}`).emit('ride_request_updated', ride);
    }

    async broadcastTripBooked(ride: any) {
        this.server.to(`driver_${ride.driverId}`).emit('trip_booked', ride);

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
        @MessageBody() data: { rideId: string; driverId: string },
    ) {
        const updatedRide = await this.ridesService.acceptRide(data.rideId, data.driverId);
        await this.broadcastRideAccepted(updatedRide);

        return updatedRide;
    }
}
