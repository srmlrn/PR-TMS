import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CounterPaymentMethod, Currency, ServiceLocation } from '@tms/types';

class PosSankalpaDto {
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

class PosServiceLineDto {
  @ApiProperty({ example: 'svc-archana' })
  @IsString()
  @MinLength(1)
  serviceId!: string;

  @ApiProperty({ example: '2026-06-07' })
  @IsString()
  @MinLength(10)
  date!: string;

  @ApiProperty({ enum: ['on_site', 'off_site'] })
  @IsEnum(['on_site', 'off_site'] satisfies ServiceLocation[])
  location!: ServiceLocation;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitCost?: number;

  @ApiPropertyOptional({ example: 'Lord Ganesha' })
  @IsOptional()
  @IsString()
  deity?: string;
}

class PosDonationLineDto {
  @ApiProperty({ example: 'General Hundi' })
  @IsString()
  @MinLength(1)
  purpose!: string;

  @ApiProperty({ example: 51 })
  @IsNumber()
  @IsPositive()
  amount!: number;
}

class PosSalesLineDto {
  @ApiProperty({ example: 'sale-laddu' })
  @IsString()
  @MinLength(1)
  itemId!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class PosCheckoutDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  devoteeId!: string;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiPropertyOptional({ type: [PosServiceLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosServiceLineDto)
  services?: PosServiceLineDto[];

  @ApiPropertyOptional({ type: [PosDonationLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosDonationLineDto)
  donations?: PosDonationLineDto[];

  @ApiPropertyOptional({ type: [PosSalesLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSalesLineDto)
  sales?: PosSalesLineDto[];

  @ApiPropertyOptional({ example: 'Family visiting from Atlanta' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Confirmed payment session UUID for grand total' })
  @IsUUID()
  paymentSessionId!: string;

  @ApiProperty({ example: 176 })
  @IsNumber()
  @IsPositive()
  totalPaid!: number;

  @ApiPropertyOptional({ example: '1042' })
  @IsOptional()
  @IsString()
  checkNumber?: string;

  @ApiPropertyOptional({ enum: ['cash', 'check', 'card'] })
  @IsOptional()
  @IsEnum(['cash', 'check', 'card', 'apple_pay', 'google_pay'] satisfies CounterPaymentMethod[])
  paymentMethod?: CounterPaymentMethod;

  @ApiPropertyOptional({ type: PosSankalpaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PosSankalpaDto)
  sankalpa?: PosSankalpaDto;
}
