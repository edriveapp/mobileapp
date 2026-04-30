import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailAttachment {
    filename: string;
    content: Buffer | string;
    contentType?: string;
}

export interface BatchEmailMessage {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from: string;
    attachments?: EmailAttachment[];
}

export interface SimpleEmailTemplate {
    title: string;
    content: string;
    cta?: { text: string; url: string };
    footerText?: string;
    logoUrl?: string;
}

@Injectable()
export class MailerService {
    private readonly logger = new Logger(MailerService.name);

    constructor(private readonly configService: ConfigService) { }

    getDefaultFromEmail() {
        return this.configService.get<string>('EMAIL_FROM') || 'support@edriveapp.com';
    }

    private formatFromAddress(from: string) {
        const trimmed = from.trim();
        if (trimmed.includes('<') && trimmed.includes('>')) {
            return trimmed;
        }

        const normalized = trimmed.toLowerCase();
        if (normalized === 'support@edriveapp.com') {
            return '"edrive support" <support@edriveapp.com>';
        }
        if (normalized === 'info@edriveapp.com') {
            return '"edrive updates" <info@edriveapp.com>';
        }
        if (normalized === 'safety@edriveapp.com') {
            return '"edrive safety" <safety@edriveapp.com>';
        }

        return `"edrive" <${trimmed}>`;
    }

    buildSimpleTemplate(template: SimpleEmailTemplate): string {
        const { title, content, cta, footerText, logoUrl } = template;
        const logo = logoUrl
            ? `<div style="text-align: right; margin-bottom: 24px;"><img src="${logoUrl}" alt="eDrive" style="height: 32px;" /></div>`
            : '';
        const ctaHtml = cta
            ? `<div style="text-align: center; margin: 24px 0;"><a href="${cta.url}" style="display: inline-block; padding: 12px 24px; background: #00A651; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">${cta.text}</a></div>`
            : '';
        const footer = footerText
            ? `<hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;" /><p style="font-size: 12px; color: #999; margin: 0;">${footerText}</p>`
            : '';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        a { color: #00A651; }
        h1, h2, h3 { margin: 0 0 12px 0; }
    </style>
</head>
<body style="margin: 0; padding: 20px; background: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 32px; border-radius: 8px;">
        ${logo}
        <h1 style="margin: 0 0 16px 0; font-size: 24px;">${title}</h1>
        <div style="color: #555; line-height: 1.8;">${content}</div>
        ${ctaHtml}
        ${footer}
    </div>
</body>
</html>
        `.trim();
    }

    async sendEmail(
        to: string[],
        subject: string,
        html: string,
        text?: string,
        options?: { from?: string; attachments?: EmailAttachment[] },
    ) {
        const recipients = Array.from(new Set((to || []).map((v) => v?.trim()).filter(Boolean)));
        if (!recipients.length) return { sent: false, reason: 'no_recipients' };

        const provider = (this.configService.get<string>('EMAIL_PROVIDER') || 'none').toLowerCase();
        const from = this.formatFromAddress(options?.from?.trim() || this.getDefaultFromEmail());

        if (provider === 'resend') {
            return this.sendWithResend(recipients, from, subject, html, text, options?.attachments);
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
                    from: this.formatFromAddress(m.from),
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
        attachments?: EmailAttachment[],
    ) {
        const apiKey = this.configService.get<string>('RESEND_API_KEY');
        if (!apiKey) {
            this.logger.warn('RESEND_API_KEY not set. Skipping email send.');
            return { sent: false, reason: 'missing_api_key' };
        }

        try {
            const basePayload = { from, subject, html, ...(text ? { text } : {}) };
            const payload = attachments ? { ...basePayload, attachments } : basePayload;

            if (to.length === 1) {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ...payload, to: to[0] }),
                });

                if (!response.ok) {
                    const body = await response.text();
                    this.logger.warn(`Resend send failed: ${response.status} ${body}`);
                    return { sent: false, reason: `resend_${response.status}` };
                }
                return { sent: true };
            }

            // Multiple recipients — batch so each gets their own addressed email
            const messages = to.map((address) => ({ ...payload, to: address }));
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
