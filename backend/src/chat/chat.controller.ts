import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chats')
export class ChatController {
    constructor(private chatService: ChatService) { }

    @Get(':rideId/messages')
    getMessages(@Param('rideId') rideId: string) {
        return this.chatService.getMessages(rideId);
    }

    @Post(':rideId/messages')
    async sendMessage(@Param('rideId') rideId: string, @Body() body: { text: string; senderId: string }) {
        // This endpoint might be used for HTTP fallback, but WebSocket is primary.
        // It's useful for saving via HTTP if socket fails or for simple testing.
        // However, standard flow is: Socket -> Gateway -> Service -> Save -> Emit.
        // If we use this endpoint, we should also emit to socket room.
        return this.chatService.saveMessage(rideId, body.text, body.senderId);
    }
}
