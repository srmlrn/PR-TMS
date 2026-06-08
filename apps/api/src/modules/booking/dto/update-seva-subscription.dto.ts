import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SevaSubscriptionFrequency, SevaSubscriptionStatus } from '@tms/types';

class SevaSubscriptionSankalpaDto {
  @IsOptional()
  @IsString()
  sponsorName?: string;

  @IsOptional()
  @IsString()
  gotram?: string;

  @IsOptional()
  @IsString()
  nakshatra?: string;

  @IsOptional()
  @IsString()
  occasion?: string;
}

export class UpdateSevaSubscriptionDto {
  @ApiPropertyOptional({ enum: ['monthly', 'annual'] })
  @IsOptional()
  @IsEnum(['monthly', 'annual'])
  frequency?: SevaSubscriptionFrequency;

  @ApiPropertyOptional({ enum: ['active', 'paused', 'cancelled'] })
  @IsOptional()
  @IsEnum(['active', 'paused', 'cancelled'])
  status?: SevaSubscriptionStatus;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  nextDate?: string;

  @ApiPropertyOptional({ type: SevaSubscriptionSankalpaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SevaSubscriptionSankalpaDto)
  sankalpa?: SevaSubscriptionSankalpaDto;
}
