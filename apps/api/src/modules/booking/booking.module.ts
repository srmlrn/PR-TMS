import { Module } from '@nestjs/common';
import { DevoteeModule } from '../devotee/devotee.module';
import { PaymentModule } from '../payment/payment.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { SevaCatalogService } from './seva-catalog.service';

@Module({
  imports: [DevoteeModule, PaymentModule],
  controllers: [BookingController],
  providers: [BookingService, SevaCatalogService],
  exports: [BookingService, SevaCatalogService],
})
export class BookingModule {}
