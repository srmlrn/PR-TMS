import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional } from 'class-validator';
import type { VolunteerCategory, VolunteerShiftRole } from '@tms/types';

const VOLUNTEER_CATEGORIES: VolunteerCategory[] = [
  'festival',
  'pooja',
  'annadanam',
  'setup',
  'cultural',
  'general',
];

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

export class UpdateVolunteerPreferencesDto {
  @ApiPropertyOptional({ example: ['festival', 'annadanam'], enum: VOLUNTEER_CATEGORIES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(VOLUNTEER_CATEGORIES, { each: true })
  categories?: VolunteerCategory[];

  @ApiPropertyOptional({ example: ['kitchen', 'parking'], enum: VOLUNTEER_SHIFT_ROLES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(VOLUNTEER_SHIFT_ROLES, { each: true })
  roles?: VolunteerShiftRole[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notifyNewOpportunities?: boolean;
}
