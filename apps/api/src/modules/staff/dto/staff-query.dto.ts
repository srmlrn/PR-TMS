import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { StaffRole } from '@tms/types';

export class StaffQueryDto {
  @ApiPropertyOptional({ enum: ['priest', 'frontdesk', 'volunteer'] })
  @IsOptional()
  @IsEnum(['priest', 'frontdesk', 'volunteer'])
  role?: StaffRole;
}
