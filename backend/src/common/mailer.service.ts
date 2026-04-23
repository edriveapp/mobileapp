import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BatchEmailMessage {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from: string;
}

@Injectable()
export class MailerService {
    private readonly logger = new Logger(MailerService.name);

    constructor(private readonly configService: ConfigService) { }

    getDefaultFromEmail() {
        return this.configService.get<string>('EMAIL_FROM') || 'support@edriveapp.com';
    }

    async sendEmail(
        to: string[],
        subject: string,
        html: string,
        text?: string,
        options?: { from?: string },
    ) {
        const recipients = Array.from(new Set((to || []).map((v) => v?.trim()).filter(Boolean)));
        if (!recipients.length) return { sent: false, reason: 'no_recipients' };

        const provider = (this.configService.get<string>('EMAIL_PROVIDER') || 'none').toLowerCase();
        const from = options?.from?.trim() || this.getDefaultFromEmail();

        if (provider === 'resend') {
            return this.sendWithResend(recipients, from, subject, html, text);
        }

        this.logger.log(
            `Email provider not configured. Would send "${subject}" to: ${recipients.join(', ')}`,
        );
        return { sent: false, reason: 'provider_not_configured' };
    }

    /** Send individually-addressed, personalized emails via Resend batch API. */
    async sendBatch(messages: BatchEmailMessage[]): Promise<{ sent: boolean; reason?: string }> {
        if (!messages.length) return { sent: false, reason: 'no_messages' };

        const provider = (this.configService.get<string>('EMAIL_PROVIDER') || 'none').toLowerCase();
        if (provider !== 'resend') {
            this.logger.log(`Batch provider not configured. Would send ${messages.length} emails.`);
            return { sent: false, reason: 'provider_not_configured' };
        }

        const apiKey = this.configService.get<string>('RESEND_API_KEY');
        if (!apiKey) {
            this.logger.warn('RESEND_API_KEY not set. Skipping batch send.');
            return { sent: false, reason: 'missing_api_key' };
        }

        try {
            for (const chunk of this.chunkArray(messages, 100)) {
                const payload = chunk.map((m) => ({
                    from: m.from,
                    to: [m.to],
                    subject: m.subject,
                    html: m.html,
                    ...(m.text ? { text: m.text } : {}),
                }));

                const response = await fetch('https://api.resend.com/emails/batch', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const body = await response.text();
                    this.logger.warn(`Resend batch failed: ${response.status} ${body}`);
                    return { sent: false, reason: `resend_${response.status}` };
                }
            }
            return { sent: true };
        } catch (error) {
            this.logger.error('Resend batch error', error as Error);
            return { sent: false, reason: 'resend_error' };
        }
    }

    private async sendWithResend(
        to: string[],
        from: string,
        subject: string,
        html: string,
        text?: string,
    ) {
        const apiKey = this.configService.get<string>('RESEND_API_KEY');
        if (!apiKey) {
            this.logger.warn('RESEND_API_KEY not set. Skipping email send.');
            return { sent: false, reason: 'missing_api_key' };
        }

        try {
            if (to.length === 1) {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ from, to: to[0], subject, html, text }),
                });

                if (!response.ok) {
                    const body = await response.text();
                    this.logger.warn(`Resend send failed: ${response.status} ${body}`);
                    return { sent: false, reason: `resend_${response.status}` };
                }
                return { sent: true };
            }

            // Multiple recipients — batch so each gets their own addressed email
            const messages = to.map((address) => ({ from, to: [address], subject, html, text }));
            const response = await fetch('https://api.resend.com/emails/batch', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
            });

            if (!response.ok) {
                const body = await response.text();
                this.logger.warn(`Resend batch send failed: ${response.status} ${body}`);
                return { sent: false, reason: `resend_${response.status}` };
            }

            return { sent: true };
        } catch (error) {
            this.logger.error('Resend send error', error as Error);
            return { sent: false, reason: 'resend_error' };
        }
    }

    private chunkArray<T>(items: T[], size: number): T[][] {
        const out: T[][] = [];
        for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
        return out;
    }
}
