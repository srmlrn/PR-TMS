import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';

@Module({
  imports: [SettingsModule],
  controllers: [PaymentController],
  providers: [PaymentService, StripeProvider, RazorpayProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
