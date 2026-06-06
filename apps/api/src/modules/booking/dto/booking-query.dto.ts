import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class BookingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter bookings on this date (ISO date)', example: '2026-06-07' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by devotee ID', example: 'dev-rajan-krishnamurthy' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  devoteeId?: string;
}

export class ServiceSlotsQueryDto {
  @ApiProperty({ description: 'Date to check availability (ISO date)', example: '2026-06-07' })
  @IsDateString()
  date!: string;
}
