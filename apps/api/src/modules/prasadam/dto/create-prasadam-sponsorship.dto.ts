import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  Currency,
  PrasadamPackageTier,
  PrasadamSponsorshipType,
} from '@tms/types';
import { SankalpaDto } from './sankalpa.dto';

export class CreatePrasadamSponsorshipDto {
  @ApiProperty({ enum: PrasadamSponsorshipType, example: PrasadamSponsorshipType.DAILY })
  @IsEnum(PrasadamSponsorshipType)
  type!: PrasadamSponsorshipType;

  @ApiProperty({ enum: PrasadamPackageTier, example: PrasadamPackageTier.GOLD })
  @IsEnum(PrasadamPackageTier)
  packageTier!: PrasadamPackageTier;

  @ApiProperty({ description: 'Devotee UUID' })
  @IsString()
  devoteeId!: string;

  @ApiPropertyOptional({ description: 'Linked sponsor UUID' })
  @IsOptional()
  @IsString()
  sponsorId?: string;

  @ApiProperty({ example: '2026-07-05' })
  @IsDateString()
  scheduledDate!: string;

  @ApiProperty({ example: 'Lord Venkateswara' })
  @IsString()
  deity!: string;

  @ApiProperty({ type: SankalpaDto })
  @ValidateNested()
  @Type(() => SankalpaDto)
  sankalpa!: SankalpaDto;

  @ApiPropertyOptional({ example: '123 Main St, San Jose, CA 95112' })
  @IsOptional()
  @IsString()
  courierAddress?: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.USD })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
