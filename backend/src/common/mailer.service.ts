import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
    private readonly logger = new Logger(MailerService.name);

    constructor(private readonly configService: ConfigService) { }

    async sendEmail(to: string[], subject: string, html: string, text?: string) {
        const recipients = Array.from(new Set((to || []).map((value) => value?.trim()).filter(Boolean)));
        if (!recipients.length) return { sent: false, reason: 'no_recipients' };

        const provider = (this.configService.get<string>('EMAIL_PROVIDER') || 'none').toLowerCase();
        const fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@edrive.ng';

        if (provider === 'resend') {
            return this.sendWithResend(recipients, fromEmail, subject, html, text);
        }

        this.logger.log(
            `Email provider not configured. Would send "${subject}" to: ${recipients.join(', ')}`,
        );
        return { sent: false, reason: 'provider_not_configured' };
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
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from,
                    to,
                    subject,
                    html,
                    text,
                }),
            });

            if (!response.ok) {
                const body = await response.text();
                this.logger.warn(`Resend send failed: ${response.status} ${body}`);
                return { sent: false, reason: `resend_${response.status}` };
            }

            return { sent: true };
        } catch (error) {
            this.logger.error('Resend send error', error as Error);
            return { sent: false, reason: 'resend_error' };
        }
    }
}
