import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, RawBodyRequest, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
    constructor(private paymentsService: PaymentsService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post('initialize')
    async initialize(@Request() req, @Body() body: { amount: number; distance?: number; estimatedDurationMinutes?: number; rideId: string }) {
        // Use user email from JWT
        return this.paymentsService.initializePayment(
            req.user.email,
            body.amount,
            body.distance || 0,
            body.estimatedDurationMinutes || 0,
            body.rideId,
        );
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('verify')
    async verify(@Query('reference') reference: string) {
        return this.paymentsService.verifyPayment(reference);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('verify/:reference')
    async verifyByPath(@Param('reference') reference: string) {
        return this.paymentsService.verifyPayment(reference);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('banks')
    async getBanks() {
        return this.paymentsService.getBanks();
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('resolve-account')
    async resolveAccount(@Body() body: { accountNumber: string; bankCode: string }) {
        return this.paymentsService.resolveAccountNumber(body.accountNumber, body.bankCode);
    }

    @Post('webhook')
    @HttpCode(200)
    async webhook(
        @Request() req: RawBodyRequest<Request>,
        @Headers('x-paystack-signature') signature: string,
        @Body() body: { event: string; data: any },
    ) {
        this.paymentsService.verifyWebhookSignature(req.rawBody, signature);
        await this.paymentsService.handleWebhookEvent(body.event, body.data);
        return { status: 'ok' };
    }
}
