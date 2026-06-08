import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBrandingSettingsDto {
  @ApiPropertyOptional({ example: 'Sri Ganesha Temple' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Hindu Cultural Center of Tennessee' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({ example: '🙏' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @ApiPropertyOptional({ example: '/tenants/sri-ganesha-temple.png' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  logoSrc?: string;

  @ApiPropertyOptional({ example: '#960000' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  logoBg?: string;

  @ApiPropertyOptional({ example: 'Lord Ganesha' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deity?: string;

  @ApiPropertyOptional({ example: 'Nashville, Tennessee' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: '527 Old Hickory Blvd, Nashville TN 37209' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  address?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  displayAnnouncements?: string[];
}
