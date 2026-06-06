import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, StripeProvider, RazorpayProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
