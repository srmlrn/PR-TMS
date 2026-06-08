import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { DatabaseModule } from './database/database.module';
import { DatabaseBootstrapService } from './database/database-bootstrap.service';
import { PlatformModule } from './modules/platform/platform.module';
import { DevoteeModule } from './modules/devotee/devotee.module';
import { BookingModule } from './modules/booking/booking.module';
import { EventModule } from './modules/event/event.module';
import { RentalModule } from './modules/rental/rental.module';
import { SponsorModule } from './modules/sponsor/sponsor.module';
import { PrasadamModule } from './modules/prasadam/prasadam.module';
import { DonationModule } from './modules/donation/donation.module';
import { FinanceModule } from './modules/finance/finance.module';
import { FrontDeskModule } from './modules/frontdesk/frontdesk.module';
import { PaymentModule } from './modules/payment/payment.module';
import { StaffModule } from './modules/staff/staff.module';
import { VolunteerModule } from './modules/volunteer/volunteer.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantDataModule } from './database/tenant-data.module';

const usePostgres = process.env.STORAGE_MODE === 'postgres';

@Module({
  imports: [
    AuthModule,
    ...(usePostgres ? [DatabaseModule] : [TenantDataModule]),
    PlatformModule,
    DevoteeModule,
    BookingModule,
    EventModule,
    RentalModule,
    SponsorModule,
    PrasadamModule,
    DonationModule,
    FinanceModule,
    FrontDeskModule,
    PaymentModule,
    StaffModule,
    VolunteerModule,
    AnalyticsModule,
    SettingsModule,
  ],
  providers: [
    TenantContextMiddleware,
    ...(usePostgres ? [DatabaseBootstrapService] : []),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
