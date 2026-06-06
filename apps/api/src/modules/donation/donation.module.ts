import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { DonationBillingService } from './donation-billing.service';
import { DonationController } from './donation.controller';
import { DonationService } from './donation.service';

@Module({
  imports: [PaymentModule],
  controllers: [DonationController],
  providers: [DonationService, DonationBillingService],
  exports: [DonationService],
})
export class DonationModule {}
