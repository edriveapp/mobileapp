import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PushNotificationsService } from '../common/push-notifications.service';
import { RidesService } from '../rides/rides.service';
import { UsersService } from '../users/users.service';
import { ChatService } from './chat.service';

@WebSocketGateway({
    cors: {
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()) : false,
        credentials: true,
    },
})
export class ChatGateway implements OnGatewayConnection {
  constructor(
    private chatService: ChatService,
    private ridesService: RidesService,
    private usersService: UsersService,
    private pushNotificationsService: PushNotificationsService,
    private jwtService: JwtService,
  ) { }

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as any)?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(true); return; }
      const payload = this.jwtService.verify(token) as any;
      client.data.userId = payload.sub;
      client.data.role = payload.role;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(@MessageBody() data: { rideId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;
    // Only allow participants of the ride to join the chat room
    const ride = await this.ridesService.findRideById(data.rideId);
    if (!ride) return;
    const isParticipant = await this.ridesService.isParticipant(data.rideId, userId);
    if (!isParticipant) return;
    client.join(`ride_${data.rideId}`);
  }

  @SubscribeMessage('leave_chat')
  handleLeaveChat(@MessageBody() data: { rideId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`ride_${data.rideId}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() payload: { rideId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Identity comes from the verified socket token, not the message body
    const senderId = client.data.userId;
    if (!senderId) return;

    const ride = await this.ridesService.findRideById(payload.rideId);
    if (!ride) return;

    // Verify sender is part of this ride
    const isParticipant = await this.ridesService.isParticipant(payload.rideId, senderId);
    if (!isParticipant) return;

    const sender = await this.usersService.findOneById(senderId);
    const senderName = sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email || 'User' : 'User';

    const savedMessage = await this.chatService.saveMessage(payload.rideId, payload.text, senderId, senderName);

    const message = {
      _id: savedMessage.id,
      rideId: payload.rideId,
      text: savedMessage.text,
      createdAt: savedMessage.createdAt,
      user: { _id: senderId, name: senderName },
    };

    this.server.to(`ride_${payload.rideId}`).emit('receive_message', message);

    const participantIds = await this.ridesService.getParticipantIds(payload.rideId);
    const isDriver = ride.driverId === senderId;
    
    for (const recipientId of participantIds) {
      if (recipientId === senderId) continue;
      
      this.server.to(`user_${recipientId}`).emit('chat_message_alert', {
        rideId: payload.rideId,
        text: payload.text,
        senderName,
      });
      this.server.to(`driver_${recipientId}`).emit('chat_message_alert', {
        rideId: payload.rideId,
        text: payload.text,
        senderName,
      });

      const tokens = await this.usersService.getPushTokensForUser(recipientId);
      await this.pushNotificationsService.sendToExpoTokens(
        tokens,
        isDriver ? 'Driver message' : 'Passenger message',
        payload.text,
        { type: 'chat_message', rideId: payload.rideId },
      );
    }
  }
}
