import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PrasadamSponsorshipType } from '@tms/types';

export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-07' })
  @IsString()
  month!: string;

  @ApiPropertyOptional({ enum: PrasadamSponsorshipType, example: PrasadamSponsorshipType.DAILY })
  @IsOptional()
  @IsEnum(PrasadamSponsorshipType)
  type?: PrasadamSponsorshipType;

  @ApiPropertyOptional({ example: 'Lord Venkateswara' })
  @IsOptional()
  @IsString()
  deity?: string;

  @ApiPropertyOptional({ example: '2026-07-05' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
