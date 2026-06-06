import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CheckInBookingDto {
  @ApiProperty()
  @IsUUID()
  bookingId!: string;
}
