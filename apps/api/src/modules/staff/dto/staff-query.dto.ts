import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import type { StaffRole } from '@tms/types';

export class StaffQueryDto {
  @ApiPropertyOptional({ enum: ['priest', 'frontdesk', 'volunteer'] })
  @IsOptional()
  @IsEnum(['priest', 'frontdesk', 'volunteer'])
  role?: StaffRole;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}
