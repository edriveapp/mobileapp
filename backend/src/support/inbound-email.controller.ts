import { Body, Controller, Headers, HttpCode, Post, RawBodyRequest, Request, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { Request as ExpressRequest } from 'express';
import { SupportService } from './support.service';

@Controller('support/inbound')
export class InboundEmailController {
    private readonly resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));

    constructor(
        private readonly supportService: SupportService,
        private readonly configService: ConfigService,
    ) { }

    @Post('resend')
    @HttpCode(200)
    async receiveResendWebhook(
        @Request() req: RawBodyRequest<ExpressRequest>,
        @Headers('svix-id') svixId: string,
        @Headers('svix-timestamp') svixTimestamp: string,
        @Headers('svix-signature') svixSignature: string,
        @Body() body: any,
    ) {
        const webhookSecret = this.configService.get<string>('RESEND_WEBHOOK_SECRET');
        if (!webhookSecret) {
            throw new UnauthorizedException('RESEND_WEBHOOK_SECRET is not configured');
        }

        const payload = req.rawBody?.toString('utf8');
        if (!payload || !svixId || !svixTimestamp || !svixSignature) {
            throw new UnauthorizedException('Invalid webhook request');
        }

        this.resend.webhooks.verify({
            payload,
            headers: {
                id: svixId,
                timestamp: svixTimestamp,
                signature: svixSignature,
            },
            webhookSecret,
        });

        if (body?.type !== 'email.received' || !body?.data?.email_id) {
            return { received: true, ignored: true };
        }

        await this.supportService.ingestInboundEmail(body.data.email_id);
        return { received: true };
    }
}
