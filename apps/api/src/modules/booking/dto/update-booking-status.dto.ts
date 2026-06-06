import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BookingStatus } from '@tms/types';

const STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
] as const;

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: STATUSES, example: BookingStatus.COMPLETED })
  @IsEnum(STATUSES)
  status!: (typeof STATUSES)[number];
}
