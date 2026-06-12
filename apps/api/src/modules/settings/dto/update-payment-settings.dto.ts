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

class UpdateStripeTerminalSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Stripe Terminal location id (tml_…)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  locationId?: string;

  @ApiPropertyOptional({ description: 'Default reader id (tmr_…) for this counter' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  defaultReaderId?: string;
}

class UpdatePayPalSettingsDto {
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
  clientId?: string;

  @ApiPropertyOptional({ description: 'Omit or leave blank to keep existing secret' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'PayPal webhook id from Developer Dashboard' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  webhookId?: string;
}

export class UpdatePaymentSettingsDto {
  @ApiPropertyOptional({ type: UpdateStripeSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateStripeSettingsDto)
  stripe?: UpdateStripeSettingsDto;

  @ApiPropertyOptional({ type: UpdatePayPalSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePayPalSettingsDto)
  paypal?: UpdatePayPalSettingsDto;

  @ApiPropertyOptional({ type: UpdateStripeTerminalSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateStripeTerminalSettingsDto)
  terminal?: UpdateStripeTerminalSettingsDto;
}
