import { Body, Controller, ForbiddenException, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RidesService } from '../rides/rides.service';
import { ChatService } from './chat.service';

@Controller('chats')
export class ChatController {
    constructor(
        private chatService: ChatService,
        private ridesService: RidesService,
    ) { }

    @UseGuards(AuthGuard('jwt'))
    @Get(':rideId/messages')
    async getMessages(@Param('rideId') rideId: string, @Request() req) {
        // Only participants of the ride may read its messages
        const ride = await this.ridesService.findRideById(rideId);
        if (!ride) return [];
        const isParticipant = await this.ridesService.isParticipant(rideId, req.user.userId);
        if (!isParticipant) {
            throw new ForbiddenException('You are not a participant of this ride');
        }
        return this.chatService.getMessages(rideId);
    }

    // HTTP fallback — WebSocket is the primary send path
    @UseGuards(AuthGuard('jwt'))
    @Post(':rideId/messages')
    async sendMessage(@Param('rideId') rideId: string, @Body() body: { text: string }, @Request() req) {
        const ride = await this.ridesService.findRideById(rideId);
        if (!ride) throw new ForbiddenException('Ride not found');
        const isParticipant = await this.ridesService.isParticipant(rideId, req.user.userId);
        if (!isParticipant) {
            throw new ForbiddenException('You are not a participant of this ride');
        }
        // senderId from the verified JWT, never from the request body
        return this.chatService.saveMessage(rideId, body.text, req.user.userId);
    }
}
