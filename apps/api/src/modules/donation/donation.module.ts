import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { DonationController } from './donation.controller';
import { DonationService } from './donation.service';

@Module({
  imports: [PaymentModule],
  controllers: [DonationController],
  providers: [DonationService],
  exports: [DonationService],
})
export class DonationModule {}
