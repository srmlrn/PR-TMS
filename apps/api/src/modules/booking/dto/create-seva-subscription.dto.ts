import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SevaSubscriptionFrequency } from '@tms/types';

class SevaSubscriptionSankalpaDto {
  @ApiPropertyOptional({ example: 'Rajan Krishnamurthy' })
  @IsOptional()
  @IsString()
  sponsorName?: string;

  @ApiPropertyOptional({ example: 'Bharadwaja' })
  @IsOptional()
  @IsString()
  gotram?: string;

  @ApiPropertyOptional({ example: 'Rohini' })
  @IsOptional()
  @IsString()
  nakshatra?: string;

  @ApiPropertyOptional({ example: 'Birthday' })
  @IsOptional()
  @IsString()
  occasion?: string;
}

export class CreateSevaSubscriptionDto {
  @ApiProperty({ example: 'dev-rajan-krishnamurthy' })
  @IsString()
  @MinLength(1)
  devoteeId!: string;

  @ApiProperty({ example: 'svc-archana' })
  @IsString()
  @MinLength(1)
  serviceId!: string;

  @ApiProperty({ enum: ['monthly', 'annual'] })
  @IsEnum(['monthly', 'annual'])
  frequency!: SevaSubscriptionFrequency;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  nextDate!: string;

  @ApiPropertyOptional({ type: SevaSubscriptionSankalpaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SevaSubscriptionSankalpaDto)
  sankalpa?: SevaSubscriptionSankalpaDto;
}
