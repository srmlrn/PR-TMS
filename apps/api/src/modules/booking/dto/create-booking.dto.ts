import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
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

  @ApiPropertyOptional({ example: 'Vrishabha' })
  @IsOptional()
  @IsString()
  rashi?: string;

  @ApiPropertyOptional({ example: 'Birthday' })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ example: 'Rajan Krishnamurthy' })
  @IsOptional()
  @IsString()
  beneficiaryName?: string;

  @ApiPropertyOptional({ example: 'Priya, Arjun' })
  @IsOptional()
  @IsString()
  additionalBeneficiaries?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  remoteParticipation?: boolean;
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

  @ApiPropertyOptional({
    description: 'Free-text priest preference (stored on sankalpa)',
    example: 'Tamil-speaking priest',
  })
  @IsOptional()
  @IsString()
  priestPreference?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ enum: ['on_site', 'off_site'] })
  @IsOptional()
  @IsEnum(['on_site', 'off_site'])
  location?: 'on_site' | 'off_site';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  remoteParticipation?: boolean;

  @ApiPropertyOptional({ example: 'Priya, Arjun' })
  @IsOptional()
  @IsString()
  additionalBeneficiaries?: string;
}
