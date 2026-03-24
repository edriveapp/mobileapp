import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PushNotificationsService } from '../common/push-notifications.service';
import { RidesService } from '../rides/rides.service';
import { UsersService } from '../users/users.service';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  constructor(
    private chatService: ChatService,
    private ridesService: RidesService,
    private usersService: UsersService,
    private pushNotificationsService: PushNotificationsService,
  ) { }

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_chat')
  handleJoinChat(@MessageBody() data: { rideId: string }, @ConnectedSocket() client: Socket) {
    client.join(`ride_${data.rideId}`);
    console.log(`Client ${client.id} joined chat for ride ${data.rideId}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(@MessageBody() payload: { rideId: string; text: string; senderId: string; role: 'DRIVER' | 'PASSENGER' }) {
    const ride = await this.ridesService.findRideById(payload.rideId);
    
    // Derive sendername
    const senderName =
      payload.role === 'DRIVER'
        ? `${ride?.driver?.firstName || ''} ${ride?.driver?.lastName || ''}`.trim() || ride?.driver?.email || 'Driver'
        : `${ride?.passenger?.firstName || ''} ${ride?.passenger?.lastName || ''}`.trim() || ride?.passenger?.email || 'Passenger';

    // Save to DB WITH senderName
    const savedMessage = await this.chatService.saveMessage(payload.rideId, payload.text, payload.senderId, senderName);

    const message = {
      _id: savedMessage.id,
      rideId: payload.rideId,
      text: savedMessage.text,
      createdAt: savedMessage.createdAt,
      user: {
        _id: payload.senderId,
        name: senderName,
      },
    };

    // Emit to everyone in the room
    this.server.to(`ride_${payload.rideId}`).emit('receive_message', message);

    const recipientId = payload.senderId === ride?.driverId ? ride?.passengerId : ride?.driverId;

    if (recipientId) {
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
        payload.role === 'DRIVER' ? 'Driver message' : 'Passenger message',
        payload.text,
        { type: 'chat_message', rideId: payload.rideId },
      );
    }
  }
}
