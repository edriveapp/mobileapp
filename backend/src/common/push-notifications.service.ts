import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushNotificationsService {
    private readonly logger = new Logger(PushNotificationsService.name);

    async sendToExpoTokens(tokens: string[], title: string, body: string, data?: Record<string, any>) {
        const validTokens = Array.from(
            new Set(tokens.filter((token) => typeof token === 'string' && token.startsWith('ExponentPushToken['))),
        );

        if (!validTokens.length) {
            return;
        }

        const messages = validTokens.map((to) => ({
            to,
            sound: 'default',
            title,
            body,
            data: data || {},
        }));

        try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
            });

            if (!response.ok) {
                const text = await response.text();
                this.logger.warn(`Expo push request failed: ${response.status} ${text}`);
            }
        } catch (error) {
            this.logger.error('Failed to send Expo push notification', error as Error);
        }
    }
}
