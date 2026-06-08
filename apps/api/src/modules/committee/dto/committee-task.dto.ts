import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { CommitteeTaskPriority, CommitteeTaskStatus } from '@tms/types';

export class CreateCommitteeTaskDto {
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
  assigneeUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  assigneeName?: string;

  @ApiPropertyOptional({ enum: ['todo', 'in_progress', 'done', 'blocked'] })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done', 'blocked'])
  status?: CommitteeTaskStatus;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: CommitteeTaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  eventId?: string;
}

export class UpdateCommitteeTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  assigneeName?: string | null;

  @ApiPropertyOptional({ enum: ['todo', 'in_progress', 'done', 'blocked'] })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done', 'blocked'])
  status?: CommitteeTaskStatus;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: CommitteeTaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  eventId?: string | null;
}
