import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class UpdateStripeSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: ['test', 'live'] })
  @IsOptional()
  @IsIn(['test', 'live'])
  mode?: 'test' | 'live';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publishableKey?: string;

  @ApiPropertyOptional({ description: 'Omit or leave blank to keep existing secret' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  secretKey?: string;

  @ApiPropertyOptional({ description: 'Omit or leave blank to keep existing webhook secret' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  webhookSecret?: string;
}

export class UpdatePaymentSettingsDto {
  @ApiPropertyOptional({ type: UpdateStripeSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateStripeSettingsDto)
  stripe?: UpdateStripeSettingsDto;
}
