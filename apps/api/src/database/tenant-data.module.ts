import { Global, Module } from '@nestjs/common';
import { TenantDataService } from './tenant-data.service';

/** Provides TenantDataService in memory mode (postgres uses DatabaseModule). */
@Global()
@Module({
  providers: [TenantDataService],
  exports: [TenantDataService],
})
export class TenantDataModule {}
