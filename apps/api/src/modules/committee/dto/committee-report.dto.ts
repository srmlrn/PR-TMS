import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { CommitteeReportPeriod } from '@tms/types';

export class CreateCommitteeReportDto {
  @ApiProperty({ enum: ['monthly', 'quarterly'] })
  @IsEnum(['monthly', 'quarterly'])
  period!: CommitteeReportPeriod;

  @ApiProperty()
  @IsString()
  @MaxLength(256)
  title!: string;

  @ApiProperty()
  @IsDateString()
  meetingDate!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  minutesSummary!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  attendanceCount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedAttendance?: number;
}
