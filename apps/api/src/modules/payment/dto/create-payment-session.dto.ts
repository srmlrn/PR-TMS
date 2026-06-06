import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Currency, PaymentProvider } from '@tms/types';

const PROVIDERS = ['stripe', 'razorpay', 'demo', 'cash'] as const satisfies readonly PaymentProvider[];

export class CreatePaymentSessionDto {
  @ApiProperty({ example: 101 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ enum: PROVIDERS, example: 'demo' })
  @IsEnum(PROVIDERS)
  provider!: PaymentProvider;

  @ApiProperty({ example: 'Archana booking' })
  @IsString()
  @MinLength(1)
  purpose!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  devoteeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
