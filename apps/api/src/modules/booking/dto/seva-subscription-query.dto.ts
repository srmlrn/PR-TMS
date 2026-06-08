import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SevaSubscriptionQueryDto {
  @ApiPropertyOptional({ description: 'Filter by devotee UUID' })
  @IsOptional()
  @IsString()
  devoteeId?: string;

  @ApiPropertyOptional({ enum: ['active', 'paused', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;
}
