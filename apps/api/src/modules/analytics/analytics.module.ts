import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { DevoteeModule } from '../devotee/devotee.module';
import { DonationModule } from '../donation/donation.module';
import { FrontDeskModule } from '../frontdesk/frontdesk.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [DevoteeModule, BookingModule, DonationModule, FrontDeskModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
