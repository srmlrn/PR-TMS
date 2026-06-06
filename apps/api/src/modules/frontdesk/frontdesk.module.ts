import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { DevoteeModule } from '../devotee/devotee.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformModule } from '../platform/platform.module';
import { FrontDeskController } from './frontdesk.controller';
import { FrontDeskService } from './frontdesk.service';

@Module({
  imports: [DevoteeModule, BookingModule, NotificationsModule, PlatformModule],
  controllers: [FrontDeskController],
  providers: [FrontDeskService],
  exports: [FrontDeskService],
})
export class FrontDeskModule {}
