import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TempleEvent } from '@tms/types';

const EVENT_TYPES = [
  'festival',
  'cultural',
  'community',
  'corporate',
  'wedding',
  'private',
] as const satisfies readonly TempleEvent['type'][];

export class CreateEventDto {
  @ApiProperty({ example: 'Brahmotsavam 2026' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: EVENT_TYPES, example: 'festival' })
  @IsEnum(EVENT_TYPES)
  type!: TempleEvent['type'];

  @ApiProperty({ example: '2026-06-08' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: ['Main Hall', 'Open Ground'] })
  @IsArray()
  @IsString({ each: true })
  venues!: string[];

  @ApiPropertyOptional({ example: 4200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedFootfall?: number;

  @ApiPropertyOptional({ example: 82000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetPlanned?: number;

  @ApiPropertyOptional({ example: 95000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenueTarget?: number;

  @ApiPropertyOptional({ example: 'Patel Family' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ example: '+1-408-555-0100' })
  @IsOptional()
  @IsString()
  clientContact?: string;
}
