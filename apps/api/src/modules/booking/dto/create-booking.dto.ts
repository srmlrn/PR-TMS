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
import { Booking } from '@tms/types';

const BOOKING_CHANNELS = ['app', 'counter', 'online', 'kiosk'] as const satisfies readonly Booking['channel'][];

class BookingSankalpaDto {
  @ApiProperty({ example: 'Rajan Krishnamurthy' })
  @IsString()
  @MinLength(1)
  sponsorName!: string;

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

  @ApiPropertyOptional({ example: 'Rajan Krishnamurthy' })
  @IsOptional()
  @IsString()
  beneficiaryName?: string;
}

export class CreateBookingDto {
  @ApiProperty({ example: 'dev-rajan-krishnamurthy' })
  @IsString()
  @MinLength(1)
  devoteeId!: string;

  @ApiProperty({ example: 'svc-archana' })
  @IsString()
  @MinLength(1)
  serviceId!: string;

  @ApiProperty({ example: '2026-06-07T09:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ type: BookingSankalpaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingSankalpaDto)
  sankalpa?: BookingSankalpaDto;

  @ApiPropertyOptional({ enum: BOOKING_CHANNELS, default: 'app' })
  @IsOptional()
  @IsEnum(BOOKING_CHANNELS)
  channel?: Booking['channel'];

  @ApiPropertyOptional({ description: 'Confirmed payment session UUID' })
  @IsOptional()
  @IsString()
  paymentSessionId?: string;
}
