import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { CommitteeRequestStatus, CommitteeRequestType } from '@tms/types';

export class CreateCommitteeRequestDto {
  @ApiProperty({ enum: ['calendar_block', 'budget', 'event', 'leave', 'task', 'general'] })
  @IsEnum(['calendar_block', 'budget', 'event', 'leave', 'task', 'general'])
  type!: CommitteeRequestType;

  @ApiProperty()
  @IsString()
  @MaxLength(256)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  blockStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  blockEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  blockTitle?: string;
}

export class UpdateCommitteeRequestDto {
  @ApiProperty({ enum: ['pending', 'approved', 'rejected', 'cancelled'] })
  @IsEnum(['pending', 'approved', 'rejected', 'cancelled'])
  status!: CommitteeRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
