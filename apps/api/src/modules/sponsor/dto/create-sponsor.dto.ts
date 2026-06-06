import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Currency, Sponsor, SponsorPipelineStage, SponsorTier } from '@tms/types';

const SPONSOR_TYPES = [
  'individual',
  'family',
  'community',
  'corporate',
  'programme',
] as const satisfies readonly Sponsor['type'][];

export class CreateSponsorDto {
  @ApiProperty({ example: 'Infosys BPM Ltd.' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: SPONSOR_TYPES, example: 'corporate' })
  @IsEnum(SPONSOR_TYPES)
  type!: Sponsor['type'];

  @ApiProperty({ enum: SponsorTier, example: SponsorTier.PLATINUM })
  @IsEnum(SponsorTier)
  tier!: SponsorTier;

  @ApiProperty({ example: 'San Jose Partnership Office' })
  @IsString()
  primaryContact!: string;

  @ApiPropertyOptional({ example: 'partnerships@infosys.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1-408-555-0200' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 25000, minimum: 0 })
  @IsNumber()
  @Min(0)
  committedAmount!: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiPropertyOptional({ enum: SponsorPipelineStage })
  @IsOptional()
  @IsEnum(SponsorPipelineStage)
  pipelineStage?: SponsorPipelineStage;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  renewsAt?: string;

  @ApiPropertyOptional({ example: 'Ravi Sharma' })
  @IsOptional()
  @IsString()
  relationshipManager?: string;
}
