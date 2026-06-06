import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { TenantEnvironment } from '@tms/types';
import type { IsolationTier } from '@tms/types';

export class ProvisionEnvironmentDto {
  @ApiProperty({ enum: TenantEnvironment })
  @IsEnum(TenantEnvironment)
  env!: TenantEnvironment;

  @ApiPropertyOptional({ example: 'us-west1' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ enum: ['shared_pool', 'standard', 'dedicated'] })
  @IsOptional()
  @IsEnum(['shared_pool', 'standard', 'dedicated'])
  isolationTier?: IsolationTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, boolean>;
}
