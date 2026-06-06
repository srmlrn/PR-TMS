import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Currency, DonationFrequency } from '@tms/types';

export class CreateDonationDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  devoteeId!: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ example: 'Temple Renovation' })
  @IsString()
  @MinLength(1)
  purpose!: string;

  @ApiPropertyOptional({ enum: DonationFrequency, default: DonationFrequency.ONE_TIME })
  @IsOptional()
  @IsEnum(DonationFrequency)
  frequency?: DonationFrequency;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Tax identifier for receipt (PAN / SSN / SIN)',
    example: 'ABCDE1234F',
  })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ description: 'Confirmed payment session UUID' })
  @IsOptional()
  @IsUUID()
  paymentSessionId?: string;
}
