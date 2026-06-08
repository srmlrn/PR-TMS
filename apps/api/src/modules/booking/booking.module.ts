import { Module, forwardRef } from '@nestjs/common';
import { DevoteeModule } from '../devotee/devotee.module';
import { PaymentModule } from '../payment/payment.module';
import { SettingsModule } from '../settings/settings.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { SevaCatalogService } from './seva-catalog.service';
import { SevaSubscriptionService } from './seva-subscription.service';

@Module({
  imports: [DevoteeModule, PaymentModule, forwardRef(() => SettingsModule)],
  controllers: [BookingController],
  providers: [BookingService, SevaCatalogService, SevaSubscriptionService],
  exports: [BookingService, SevaCatalogService, SevaSubscriptionService],
})
export class BookingModule {}
