import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { TenantEnvironment } from '@tms/types';

export class PromoteEnvironmentDto {
  @ApiProperty({ enum: TenantEnvironment, example: TenantEnvironment.UAT })
  @IsEnum(TenantEnvironment)
  sourceEnv!: TenantEnvironment;

  @ApiProperty({ enum: TenantEnvironment, example: TenantEnvironment.PROD })
  @IsEnum(TenantEnvironment)
  targetEnv!: TenantEnvironment;

  @ApiProperty({ default: true })
  @IsBoolean()
  includeConfig!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  includeReferenceData!: boolean;
}
