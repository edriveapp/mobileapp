import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupportService } from './support.service';
import { SupportTicketStatus } from './support-ticket.entity';

@Controller('support')
@UseGuards(AuthGuard('jwt'))
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    @Post('tickets')
    createTicket(
        @Request() req: any,
        @Body() body: { subject: string; description: string; category?: string; priority?: string },
    ) {
        return this.supportService.createTicket(req.user.userId, body);
    }

    @Get('tickets/my')
    getMyTickets(@Request() req: any) {
        return this.supportService.getMyTickets(req.user.userId);
    }

    @Get('tickets/admin')
    getAdminTickets(
        @Request() req: any,
        @Query('status') status?: SupportTicketStatus,
        @Query('category') category?: string,
        @Query('includeInbound') includeInbound?: string,
    ) {
        return this.supportService.getAdminTickets(req.user.userId, status, {
            category,
            includeInbound: includeInbound === 'true',
        });
    }

    @Get('tickets/:id')
    getTicket(@Request() req: any, @Param('id') id: string) {
        return this.supportService.getTicketById(id, req.user.userId);
    }

    @Post('tickets/:id/messages')
    addMessage(@Request() req: any, @Param('id') id: string, @Body() body: { text: string }) {
        return this.supportService.addMessage(id, req.user.userId, body.text);
    }

    @Patch('tickets/:id/status')
    setStatus(@Request() req: any, @Param('id') id: string, @Body() body: { status: SupportTicketStatus }) {
        return this.supportService.updateTicketStatus(id, req.user.userId, body.status);
    }

    @Patch('tickets/:id/assign')
    assign(@Request() req: any, @Param('id') id: string, @Body() body: { assignedToUserId: string }) {
        return this.supportService.assignTicket(id, req.user.userId, body.assignedToUserId);
    }
}
