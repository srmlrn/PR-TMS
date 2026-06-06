import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from '../../database/entities/control/tenant.entity';
import { TenantEnvironmentEntity } from '../../database/entities/control/tenant-environment.entity';
import { UsageMeterEntity } from '../../database/entities/control/usage-meter.entity';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

const usePostgres = process.env.STORAGE_MODE === 'postgres';

@Module({
  imports: usePostgres
    ? [
        TypeOrmModule.forFeature([
          TenantEntity,
          TenantEnvironmentEntity,
          UsageMeterEntity,
        ]),
      ]
    : [],
  controllers: [PlatformController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
