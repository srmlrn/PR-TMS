import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DevoteeGender, ImportantDate, ImportantDateType } from '@tms/types';

class ImportantDateDto {
  @ApiProperty({ example: 'Birthday' })
  @IsString()
  label!: string;

  @ApiProperty({ example: '1985-03-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ enum: ['birthday', 'anniversary', 'star_day', 'other'] })
  @IsEnum(['birthday', 'anniversary', 'star_day', 'other'] as const)
  type!: ImportantDateType;
}

class CreateAddressDto {
  @ApiPropertyOptional({ example: '123 Temple Way' })
  @IsOptional()
  @IsString()
  line1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional({ example: 'Fremont' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'CA' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '94536' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  country?: string;
}

const GENDERS = ['male', 'female', 'other'] as const satisfies readonly DevoteeGender[];

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

  @ApiPropertyOptional({ example: 'Vrishabha' })
  @IsOptional()
  @IsString()
  rashi?: string;

  @ApiPropertyOptional({ enum: GENDERS })
  @IsOptional()
  @IsEnum(GENDERS)
  gender?: DevoteeGender;

  @ApiPropertyOptional({ example: '1985-03-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyId?: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isNri?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  communicationOptIn?: boolean;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional({ type: [ImportantDateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportantDateDto)
  importantDates?: ImportantDate[];

  @ApiPropertyOptional({ type: CreateAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
