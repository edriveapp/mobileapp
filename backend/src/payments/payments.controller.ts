import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
    constructor(private paymentsService: PaymentsService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post('initialize')
    async initialize(@Request() req, @Body() body: { amount: number }) {
        // Use user email from JWT
        return this.paymentsService.initializePayment(req.user.email, body.amount);
    }

    @Get('verify')
    async verify(@Query('reference') reference: string) {
        return this.paymentsService.verifyPayment(reference);
    }

    @Post('webhook')
    async webhook(@Body() body) {
        // Handle Paystack webhook for updates
        console.log('Payment Webhook:', body);
        return { status: 'received' };
    }
}
