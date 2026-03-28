import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '../common/mailer.service';
import { User, UserRole, AdminScope } from '../users/user.entity';
import { SupportMessage } from './support-message.entity';
import { SupportTicket, SupportTicketStatus } from './support-ticket.entity';

@Injectable()
export class SupportService {
    constructor(
        @InjectRepository(SupportTicket)
        private ticketsRepository: Repository<SupportTicket>,
        @InjectRepository(SupportMessage)
        private messagesRepository: Repository<SupportMessage>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private readonly mailerService: MailerService,
    ) { }

    private async getActor(userId: string) {
        const actor = await this.usersRepository.findOne({ where: { id: userId } });
        if (!actor) throw new NotFoundException('User not found');
        return actor;
    }

    private canManageSupport(actor: User) {
        if (actor.role !== UserRole.ADMIN) return false;
        return [AdminScope.SUPER_ADMIN, AdminScope.SUPPORT].includes(actor.adminScope);
    }

    async createTicket(userId: string, payload: { subject: string; description: string; category?: string; priority?: string }) {
        const actor = await this.getActor(userId);
        const ticket = this.ticketsRepository.create({
            createdByUserId: actor.id,
            createdByRole: actor.role,
            subject: payload.subject,
            description: payload.description,
            category: payload.category || 'general',
            priority: payload.priority || 'normal',
            status: SupportTicketStatus.OPEN,
        });

        const saved = await this.ticketsRepository.save(ticket);
        const firstMessage = this.messagesRepository.create({
            ticketId: saved.id,
            senderId: actor.id,
            senderRole: actor.role,
            text: payload.description,
        });
        await this.messagesRepository.save(firstMessage);

        const supportRecipients = await this.getSupportNotificationEmails();
        await this.mailerService.sendEmail(
            supportRecipients,
            `New support ticket: ${saved.subject}`,
            `<p>New ticket from ${actor.email}</p><p><strong>${saved.subject}</strong></p><p>${saved.description}</p>`,
            `New ticket from ${actor.email}: ${saved.subject}`,
        );

        return this.getTicketById(saved.id, userId);
    }

    async getMyTickets(userId: string) {
        return this.ticketsRepository.find({
            where: { createdByUserId: userId },
            order: { updatedAt: 'DESC' },
        });
    }

    async getAdminTickets(userId: string, status?: SupportTicketStatus) {
        const actor = await this.getActor(userId);
        if (!this.canManageSupport(actor)) {
            throw new ForbiddenException('You do not have support permissions');
        }

        const where = status ? { status } : {};
        return this.ticketsRepository.find({
            where,
            order: { updatedAt: 'DESC' },
            take: 200,
        });
    }

    async getTicketById(ticketId: string, userId: string) {
        const actor = await this.getActor(userId);
        const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        const isOwner = ticket.createdByUserId === actor.id;
        const canAdminView = this.canManageSupport(actor);
        if (!isOwner && !canAdminView) {
            throw new ForbiddenException('Access denied');
        }

        const messages = await this.messagesRepository.find({
            where: { ticketId },
            order: { createdAt: 'ASC' },
        });

        return { ...ticket, messages };
    }

    async addMessage(ticketId: string, userId: string, text: string) {
        const actor = await this.getActor(userId);
        const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        const isOwner = ticket.createdByUserId === actor.id;
        const canAdminReply = this.canManageSupport(actor);
        if (!isOwner && !canAdminReply) {
            throw new ForbiddenException('Access denied');
        }

        const message = this.messagesRepository.create({
            ticketId,
            senderId: actor.id,
            senderRole: actor.role,
            text,
        });
        await this.messagesRepository.save(message);

        await this.ticketsRepository.update(ticketId, {
            updatedAt: new Date(),
            status: ticket.status === SupportTicketStatus.RESOLVED ? SupportTicketStatus.IN_PROGRESS : ticket.status,
        });

        const supportRecipients = await this.getSupportNotificationEmails();
        await this.mailerService.sendEmail(
            supportRecipients,
            `Support ticket updated: ${ticket.subject}`,
            `<p>Ticket <strong>${ticket.subject}</strong> has a new message from ${actor.role}.</p><p>${text}</p>`,
            `Ticket ${ticket.subject} has a new message.`,
        );

        return this.getTicketById(ticketId, userId);
    }

    async updateTicketStatus(ticketId: string, userId: string, status: SupportTicketStatus) {
        const actor = await this.getActor(userId);
        if (!this.canManageSupport(actor)) {
            throw new ForbiddenException('You do not have support permissions');
        }
        await this.ticketsRepository.update(ticketId, { status });
        return this.getTicketById(ticketId, userId);
    }

    async assignTicket(ticketId: string, userId: string, assignedToUserId: string) {
        const actor = await this.getActor(userId);
        if (!this.canManageSupport(actor)) {
            throw new ForbiddenException('You do not have support permissions');
        }
        await this.ticketsRepository.update(ticketId, { assignedToUserId, status: SupportTicketStatus.IN_PROGRESS });
        return this.getTicketById(ticketId, userId);
    }

    private async getSupportNotificationEmails() {
        const admins = await this.usersRepository.find({
            where: { role: UserRole.ADMIN },
        });

        return admins
            .filter((admin) => [AdminScope.SUPER_ADMIN, AdminScope.SUPPORT].includes(admin.adminScope))
            .map((admin) => admin.email)
            .filter(Boolean);
    }
}
