import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { CommitteeMemberRole } from '@tms/types';

export class CreateCommitteeMemberDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: ['chair', 'vice_chair', 'secretary', 'member'] })
  @IsEnum(['chair', 'vice_chair', 'secretary', 'member'])
  role!: CommitteeMemberRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayTitle?: string;
}

export class UpdateCommitteeMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: ['chair', 'vice_chair', 'secretary', 'member'] })
  @IsOptional()
  @IsEnum(['chair', 'vice_chair', 'secretary', 'member'])
  role?: CommitteeMemberRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
