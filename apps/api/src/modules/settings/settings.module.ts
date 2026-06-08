import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantPaymentSettingsEntity } from '../../database/entities/control/tenant-payment-settings.entity';
import { SettingsController } from './settings.controller';
import { TenantPaymentSettingsService } from './tenant-payment-settings.service';

const usePostgres = process.env.STORAGE_MODE === 'postgres';

@Module({
  imports: usePostgres
    ? [TypeOrmModule.forFeature([TenantPaymentSettingsEntity])]
    : [],
  controllers: [SettingsController],
  providers: [TenantPaymentSettingsService],
  exports: [TenantPaymentSettingsService],
})
export class SettingsModule {}
