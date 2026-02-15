import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  constructor(private chatService: ChatService) { }

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_chat')
  handleJoinChat(@MessageBody() data: { rideId: string }, @ConnectedSocket() client: Socket) {
    client.join(`ride_${data.rideId}`);
    console.log(`Client ${client.id} joined chat for ride ${data.rideId}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(@MessageBody() payload: { rideId: string; text: string; senderId: string; role: 'DRIVER' | 'PASSENGER' }) {
    // Save to DB
    const savedMessage = await this.chatService.saveMessage(payload.rideId, payload.text, payload.senderId);

    const message = {
      _id: savedMessage.id,
      text: savedMessage.text,
      createdAt: savedMessage.createdAt,
      user: {
        _id: payload.senderId, // or savedMessage.senderId
        name: payload.role === 'DRIVER' ? 'Driver' : 'Passenger',
      },
    };

    // Emit to everyone in the room
    this.server.to(`ride_${payload.rideId}`).emit('receive_message', message);
  }
}