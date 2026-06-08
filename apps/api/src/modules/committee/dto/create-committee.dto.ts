import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type {
  CommitteeCategory,
  CommitteeType,
  MeetingCadence,
} from '@tms/types';

export class CreateCommitteeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({
    enum: ['governance', 'religious', 'cultural', 'education', 'operations', 'outreach', 'staff'],
  })
  @IsOptional()
  @IsEnum(['governance', 'religious', 'cultural', 'education', 'operations', 'outreach', 'staff'])
  category?: CommitteeCategory;

  @ApiPropertyOptional({ enum: ['standing', 'ad_hoc', 'staff'] })
  @IsOptional()
  @IsEnum(['standing', 'ad_hoc', 'staff'])
  committeeType?: CommitteeType;

  @ApiPropertyOptional({
    enum: ['weekly', 'monthly', 'quarterly', 'annual', 'as_needed'],
  })
  @IsOptional()
  @IsEnum(['weekly', 'monthly', 'quarterly', 'annual', 'as_needed'])
  meetingCadence?: MeetingCadence;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publicRoster?: boolean;
}

export class UpdateCommitteeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({
    enum: ['governance', 'religious', 'cultural', 'education', 'operations', 'outreach', 'staff'],
  })
  @IsOptional()
  @IsEnum(['governance', 'religious', 'cultural', 'education', 'operations', 'outreach', 'staff'])
  category?: CommitteeCategory;

  @ApiPropertyOptional({ enum: ['standing', 'ad_hoc', 'staff'] })
  @IsOptional()
  @IsEnum(['standing', 'ad_hoc', 'staff'])
  committeeType?: CommitteeType;

  @ApiPropertyOptional({
    enum: ['weekly', 'monthly', 'quarterly', 'annual', 'as_needed'],
  })
  @IsOptional()
  @IsEnum(['weekly', 'monthly', 'quarterly', 'annual', 'as_needed'])
  meetingCadence?: MeetingCadence;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publicRoster?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CommitteeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mine?: boolean;
}
