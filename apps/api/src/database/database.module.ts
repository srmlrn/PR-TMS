import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from './entities/control/tenant.entity';
import { TenantEnvironmentEntity } from './entities/control/tenant-environment.entity';
import { UsageMeterEntity } from './entities/control/usage-meter.entity';
import { TenantPaymentSettingsEntity } from './entities/control/tenant-payment-settings.entity';
import { TenantSiteSettingsEntity } from './entities/control/tenant-site-settings.entity';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantResolverService } from './tenant-resolver.service';
import { EnvironmentProvisionerService } from './environment-provisioner.service';
import { TenantSeedService } from './tenant-seed.service';
import { TenantDataService } from './tenant-data.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USER ?? 'tms',
      password: process.env.DATABASE_PASSWORD ?? 'tms_dev',
      database: process.env.DATABASE_NAME ?? 'tms_control',
      entities: [
        TenantEntity,
        TenantEnvironmentEntity,
        UsageMeterEntity,
        TenantPaymentSettingsEntity,
        TenantSiteSettingsEntity,
      ],
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
    }),
    TypeOrmModule.forFeature([
      TenantEntity,
      TenantEnvironmentEntity,
      UsageMeterEntity,
      TenantPaymentSettingsEntity,
      TenantSiteSettingsEntity,
    ]),
  ],
  providers: [
    TenantConnectionService,
    TenantResolverService,
    EnvironmentProvisionerService,
    TenantSeedService,
    TenantDataService,
  ],
  exports: [
    TypeOrmModule,
    TenantConnectionService,
    TenantResolverService,
    EnvironmentProvisionerService,
    TenantSeedService,
    TenantDataService,
  ],
})
export class DatabaseModule {}
