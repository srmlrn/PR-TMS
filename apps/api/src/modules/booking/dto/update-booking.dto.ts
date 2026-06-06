import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateBookingDto {
  @ApiPropertyOptional({ description: 'Priest UUID to assign to this booking' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  priestId?: string;
}
