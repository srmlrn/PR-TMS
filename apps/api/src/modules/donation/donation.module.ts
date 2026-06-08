import { Module, forwardRef } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { SettingsModule } from '../settings/settings.module';
import { DonationBillingService } from './donation-billing.service';
import { DonationController } from './donation.controller';
import { DonationService } from './donation.service';

@Module({
  imports: [PaymentModule, forwardRef(() => SettingsModule)],
  controllers: [DonationController],
  providers: [DonationService, DonationBillingService],
  exports: [DonationService],
})
export class DonationModule {}
