import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { DevoteeModule } from '../devotee/devotee.module';
import { DonationModule } from '../donation/donation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';
import { PlatformModule } from '../platform/platform.module';
import { FrontDeskController } from './frontdesk.controller';
import { FrontDeskService } from './frontdesk.service';

@Module({
  imports: [DevoteeModule, BookingModule, DonationModule, NotificationsModule, PlatformModule, PaymentModule],
  controllers: [FrontDeskController],
  providers: [FrontDeskService],
  exports: [FrontDeskService],
})
export class FrontDeskModule {}
