import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@tms/types';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTerminalCheckoutDto {
  @ApiProperty({ example: 101 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ example: 'Counter POS — Archana' })
  @IsString()
  @MinLength(1)
  purpose!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  devoteeId?: string;
}

export class ProcessTerminalCheckoutDto {
  @ApiPropertyOptional({ description: 'Override default reader (tmr_…)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  readerId?: string;
}
