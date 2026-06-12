import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PayPalProvider } from './paypal.provider';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';
import { StripeTerminalService } from './stripe-terminal.service';

@Module({
  imports: [SettingsModule],
  controllers: [PaymentController],
  providers: [PaymentService, StripeProvider, StripeTerminalService, RazorpayProvider, PayPalProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
