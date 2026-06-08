import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import type { CommitteeTargetPeriod } from '@tms/types';

export class CreateCommitteeTargetDto {
  @ApiProperty()
  @IsString()
  @MaxLength(256)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsEnum(['monthly', 'quarterly', 'annual'])
  period!: CommitteeTargetPeriod;

  @ApiProperty()
  @IsNumber()
  targetValue!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateCommitteeTargetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsOptional()
  @IsEnum(['monthly', 'quarterly', 'annual'])
  period?: CommitteeTargetPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
