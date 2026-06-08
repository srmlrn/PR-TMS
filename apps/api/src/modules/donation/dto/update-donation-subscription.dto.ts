import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateDonationSubscriptionDto {
  @ApiPropertyOptional({ enum: ['active', 'paused', 'cancelled'] })
  @IsOptional()
  @IsEnum(['active', 'paused', 'cancelled'])
  status?: 'active' | 'paused' | 'cancelled';
}
