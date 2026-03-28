import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
    constructor(private paymentsService: PaymentsService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post('initialize')
    async initialize(@Request() req, @Body() body: { amount: number; distance: number; rideId: string }) {
        // Use user email from JWT
        return this.paymentsService.initializePayment(req.user.email, body.amount, body.distance || 0, body.rideId);
    }

    @Get('verify')
    async verify(@Query('reference') reference: string) {
        return this.paymentsService.verifyPayment(reference);
    }

    @Get('verify/:reference')
    async verifyByPath(@Param('reference') reference: string) {
        return this.paymentsService.verifyPayment(reference);
    }

    @Post('webhook')
    async webhook(@Body() body) {
        // Handle Paystack webhook for updates
        console.log('Payment Webhook:', body);
        return { status: 'received' };
    }
}
