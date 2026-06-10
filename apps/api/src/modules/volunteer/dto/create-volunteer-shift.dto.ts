import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { VolunteerCategory, VolunteerShiftRole } from '@tms/types';

const VOLUNTEER_SHIFT_ROLES: VolunteerShiftRole[] = [
  'general',
  'kitchen',
  'parking',
  'setup',
  'crowd',
  'kids',
  'decoration',
  'cultural',
  'priest_assist',
];

const VOLUNTEER_CATEGORIES: VolunteerCategory[] = [
  'festival',
  'pooja',
  'annadanam',
  'setup',
  'cultural',
  'general',
];

export class CreateVolunteerShiftDto {
  @ApiProperty({ example: 'Brahmotsavam Setup' })
  @IsString()
  @MaxLength(256)
  title!: string;

  @ApiProperty({ example: '2026-06-08' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  endTime!: string;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  slots!: number;

  @ApiPropertyOptional({ example: 'Help set up decorations and stage area.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Main Hall' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  location?: string;

  @ApiPropertyOptional({ example: 'setup', enum: VOLUNTEER_SHIFT_ROLES })
  @IsOptional()
  @IsIn(VOLUNTEER_SHIFT_ROLES)
  role?: VolunteerShiftRole;

  @ApiPropertyOptional({ example: 'evt-brahmotsavam-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  eventId?: string;

  @ApiPropertyOptional({ example: 'Brahmotsavam 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  eventName?: string;

  @ApiPropertyOptional({ example: 'Priya Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  coordinator?: string;

  @ApiPropertyOptional({ example: 'festival', enum: VOLUNTEER_CATEGORIES })
  @IsOptional()
  @IsIn(VOLUNTEER_CATEGORIES)
  category?: VolunteerCategory;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRecurringTemplate?: boolean;

  @ApiPropertyOptional({ example: 'sunday-annadanam' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateKey?: string;
}
