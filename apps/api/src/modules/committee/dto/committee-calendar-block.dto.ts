import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCommitteeCalendarBlockDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  title!: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ enum: ['committee', 'personal', 'temple'] })
  @IsOptional()
  @IsEnum(['committee', 'personal', 'temple'])
  blockType?: 'committee' | 'personal' | 'temple';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  blocksTempleCalendar?: boolean;
}

export class UpdateCommitteeCalendarBlockDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ enum: ['committee', 'personal', 'temple'] })
  @IsOptional()
  @IsEnum(['committee', 'personal', 'temple'])
  blockType?: 'committee' | 'personal' | 'temple';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  blocksTempleCalendar?: boolean;
}
