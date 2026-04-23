import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Resend } from 'resend';
import { Repository } from 'typeorm';
import { MailerService } from '../common/mailer.service';
import { User, UserRole, AdminScope } from '../users/user.entity';
import { SupportMessage } from './support-message.entity';
import { SupportTicket, SupportTicketStatus } from './support-ticket.entity';

@Injectable()
export class SupportService {
    private readonly logger = new Logger(SupportService.name);
    private readonly resend: Resend;

    constructor(
        @InjectRepository(SupportTicket)
        private ticketsRepository: Repository<SupportTicket>,
        @InjectRepository(SupportMessage)
        private messagesRepository: Repository<SupportMessage>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
    ) {
        this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    }

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
            createdByEmail: actor.email,
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
            senderEmail: actor.email,
            text: payload.description,
        });
        await this.messagesRepository.save(firstMessage);

        const supportRecipients = await this.getSupportNotificationEmails();
        await this.mailerService.sendEmail(
            supportRecipients,
            `New support ticket: ${saved.subject}`,
            `<p>New ticket from ${actor.email}</p><p><strong>${saved.subject}</strong></p><p>${saved.description}</p>`,
            `New ticket from ${actor.email}: ${saved.subject}`,
            { from: 'support@edriveapp.com' },
        );

        return this.getTicketById(saved.id, userId);
    }

    private resolveDisplayName(user: User | undefined, fallbackRole: string, fallbackEmail?: string | null): string {
        if (!user) {
            if (fallbackEmail) return fallbackEmail;
            return fallbackRole === 'admin' ? 'Support Agent' : fallbackRole === 'email' ? 'Incoming Email' : 'User';
        }
        const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (full) return full;
        if (user.adminScope && user.adminScope !== 'none') return 'Support Agent';
        return user.email || fallbackRole;
    }

    private async enrichMessages(messages: SupportMessage[]) {
        const senderIds = [...new Set(messages.map((m) => m.senderId).filter(Boolean))];
        if (!senderIds.length) return messages as (SupportMessage & { senderName: string })[];
        const users = await this.usersRepository.find({ where: senderIds.map((id) => ({ id })) });
        const userMap = new Map(users.map((u) => [u.id, u]));
        return messages.map((m) => ({
            ...m,
            senderName: this.resolveDisplayName(
                m.senderId ? userMap.get(m.senderId) : undefined,
                m.senderRole,
                m.senderEmail,
            ),
        }));
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
        const tickets = await this.ticketsRepository.find({
            where,
            order: { updatedAt: 'DESC' },
            take: 200,
        });

        // Attach creator display name to each ticket
        const creatorIds = [...new Set(tickets.map((t) => t.createdByUserId))];
        const creators = creatorIds.length
            ? await this.usersRepository.find({ where: creatorIds.map((id) => ({ id })) })
            : [];
        const creatorMap = new Map(creators.map((u) => [u.id, u]));

        return tickets.map((t) => ({
            ...t,
            creatorName: this.resolveDisplayName(
                t.createdByUserId ? creatorMap.get(t.createdByUserId) : undefined,
                t.createdByRole,
                t.createdByEmail,
            ),
        }));
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

        const rawMessages = await this.messagesRepository.find({
            where: { ticketId },
            order: { createdAt: 'ASC' },
        });

        const messages = await this.enrichMessages(rawMessages);
        const creator = ticket.createdByUserId
            ? await this.usersRepository.findOne({ where: { id: ticket.createdByUserId } })
            : null;

        return {
            ...ticket,
            creatorName: this.resolveDisplayName(creator || undefined, ticket.createdByRole, ticket.createdByEmail),
            messages,
        };
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
            senderEmail: actor.email,
            text,
        });
        await this.messagesRepository.save(message);

        await this.ticketsRepository.update(ticketId, {
            updatedAt: new Date(),
            status: ticket.status === SupportTicketStatus.RESOLVED ? SupportTicketStatus.IN_PROGRESS : ticket.status,
        });

        const senderName = this.resolveDisplayName(actor, actor.role);
        const supportRecipients = await this.getSupportNotificationEmails();
        await this.mailerService.sendEmail(
            supportRecipients,
            `Support ticket updated: ${ticket.subject}`,
            `<p>Ticket <strong>${ticket.subject}</strong> has a new message from <strong>${senderName}</strong> (${actor.role}).</p><p>${text}</p>`,
            `Ticket ${ticket.subject} has a new message from ${senderName}.`,
            { from: 'support@edriveapp.com' },
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

    async ingestInboundEmail(emailId: string) {
        if (!this.resend) {
            this.logger.warn('Resend client is not configured for inbound email ingestion');
            return { success: false, reason: 'resend_not_configured' };
        }

        const existing = await this.ticketsRepository.findOne({ where: { inboundMessageId: emailId } });
        if (existing) {
            return { success: true, deduped: true, ticketId: existing.id };
        }

        const result = await this.resend.emails.receiving.get(emailId);
        const email = result?.data;
        if (!email) {
            this.logger.warn(`Received inbound webhook for missing email ${emailId}`);
            return { success: false, reason: 'email_not_found' };
        }

        const parsed = this.parseMailbox(email.from || '');
        const knownUser = parsed.email
            ? await this.usersRepository.findOne({ where: { email: parsed.email.toLowerCase() } })
            : null;

        const textBody = this.normalizeIncomingText(email.text || this.stripHtml(email.html || ''));
        const subject = (email.subject || 'Incoming email').trim();
        const displayEmail = parsed.email || email.from || 'unknown@sender';
        const toLine = Array.isArray(email.to) ? email.to.join(', ') : '';
        const attachmentCount = Array.isArray(email.attachments) ? email.attachments.length : 0;
        const description = [
            `Inbound email received from ${displayEmail}.`,
            toLine ? `Delivered to: ${toLine}` : null,
            attachmentCount ? `Attachments: ${attachmentCount}` : null,
            '',
            textBody || 'No message body was provided.',
        ].filter(Boolean).join('\n');

        const ticket = this.ticketsRepository.create({
            createdByUserId: knownUser?.id || null,
            createdByRole: knownUser?.role || 'email',
            createdByEmail: parsed.email || email.from || null,
            subject,
            description,
            category: 'inbound_email',
            priority: 'normal',
            status: SupportTicketStatus.OPEN,
            inboundMessageId: emailId,
        });

        const saved = await this.ticketsRepository.save(ticket);
        const firstMessage = this.messagesRepository.create({
            ticketId: saved.id,
            senderId: knownUser?.id || null,
            senderRole: knownUser?.role || 'email',
            senderEmail: parsed.email || email.from || null,
            text: textBody || 'No message body was provided.',
        });
        await this.messagesRepository.save(firstMessage);

        const supportRecipients = await this.getSupportNotificationEmails();
        await this.mailerService.sendEmail(
            supportRecipients,
            `Incoming support email: ${subject}`,
            `<p><strong>From:</strong> ${this.escapeHtml(displayEmail)}</p><p><strong>To:</strong> ${this.escapeHtml(toLine || 'support inbox')}</p><p><strong>Ticket:</strong> ${saved.id}</p><hr /><pre style="white-space:pre-wrap;font-family:inherit;">${this.escapeHtml(textBody || 'No message body was provided.')}</pre>`,
            `Incoming support email from ${displayEmail}\nTo: ${toLine || 'support inbox'}\nTicket: ${saved.id}\n\n${textBody || 'No message body was provided.'}`,
            { from: 'support@edriveapp.com' },
        );

        return { success: true, ticketId: saved.id };
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

    private parseMailbox(value: string) {
        const trimmed = value.trim();
        const match = trimmed.match(/^(.*)<([^>]+)>$/);
        if (!match) {
            return { name: '', email: trimmed.replace(/^"+|"+$/g, '') };
        }

        return {
            name: match[1].trim().replace(/^"+|"+$/g, ''),
            email: match[2].trim().toLowerCase(),
        };
    }

    private stripHtml(value: string) {
        return value
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    private normalizeIncomingText(value: string) {
        return value.replace(/\r\n/g, '\n').trim();
    }

    private escapeHtml(value: string) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
