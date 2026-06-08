import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantPaymentSettingsEntity } from '../../database/entities/control/tenant-payment-settings.entity';
import { TenantSiteSettingsEntity } from '../../database/entities/control/tenant-site-settings.entity';
import { BookingModule } from '../booking/booking.module';
import {
  BrandingController,
  CatalogController,
  SettingsController,
} from './settings.controller';
import { PosCatalogService } from './pos-catalog.service';
import { TenantPaymentSettingsService } from './tenant-payment-settings.service';
import { TenantSiteSettingsService } from './tenant-site-settings.service';

const usePostgres = process.env.STORAGE_MODE === 'postgres';

const controlEntities = usePostgres
  ? [TenantPaymentSettingsEntity, TenantSiteSettingsEntity]
  : [];

@Module({
  imports: [
    ...(controlEntities.length ? [TypeOrmModule.forFeature(controlEntities)] : []),
    forwardRef(() => BookingModule),
  ],
  controllers: [SettingsController, BrandingController, CatalogController],
  providers: [TenantPaymentSettingsService, TenantSiteSettingsService, PosCatalogService],
  exports: [TenantPaymentSettingsService, TenantSiteSettingsService, PosCatalogService],
})
export class SettingsModule {}
