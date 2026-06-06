import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateDevoteeDto {
  @ApiProperty({ example: 'Rajan' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Krishnamurthy' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiPropertyOptional({ example: 'rajan@ex.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1 510-555-0191' })
  @IsString()
  @MinLength(1)
  phone!: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @MinLength(2)
  country!: string;

  @ApiPropertyOptional({ example: 'Bharadwaja' })
  @IsOptional()
  @IsString()
  gotram?: string;

  @ApiPropertyOptional({ example: 'Rohini' })
  @IsOptional()
  @IsString()
  nakshatra?: string;
}
