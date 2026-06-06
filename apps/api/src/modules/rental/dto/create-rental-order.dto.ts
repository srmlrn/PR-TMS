import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Currency } from '@tms/types';
import { RentalAssetLineDto } from './rental-asset-line.dto';

export class CreateRentalOrderDto {
  @ApiProperty({ example: 'Patel Wedding' })
  @IsString()
  clientName!: string;

  @ApiPropertyOptional({ description: 'Linked event UUID' })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ type: [RentalAssetLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalAssetLineDto)
  assetIds!: RentalAssetLineDto[];

  @ApiProperty({ example: '2026-09-14' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-09-14' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 500, minimum: 0 })
  @IsNumber()
  @Min(0)
  depositAmount!: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.USD })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
