import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import type { StaffLeaveType } from '@tms/types';

export class CreateStaffLeaveDto {
  @ApiPropertyOptional({ description: 'Required for admin; resolved from login for priests' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiProperty({ enum: ['annual', 'sick', 'personal', 'festival', 'other'] })
  @IsEnum(['annual', 'sick', 'personal', 'festival', 'other'])
  type!: StaffLeaveType;

  @ApiProperty({ example: '2026-06-10' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-06-12' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
