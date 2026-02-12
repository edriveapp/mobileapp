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
import { RedisService } from '../common/redis.service';
import { RidesService } from './rides.service';

@WebSocketGateway({ cors: true })
export class RidesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private ridesService: RidesService,
        private redisService: RedisService,
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
    }

    @SubscribeMessage('accept_ride')
    async handleAcceptRide(
        @MessageBody() data: { rideId: string; driverId: string },
    ) {
        const updatedRide = await this.ridesService.acceptRide(data.rideId, data.driverId);

        // Notify passenger
        // Assuming passenger joined `ride_{rideId}` room or `passenger_{id}`
        // We need to track socket mapping. For simplicity, let's assume client joined `user_${passengerId}`
        this.server.to(`user_${updatedRide.passengerId}`).emit('driver_accepted', updatedRide);

        return updatedRide;
    }
}
