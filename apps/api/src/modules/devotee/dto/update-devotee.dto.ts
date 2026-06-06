import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { Devotee, DevoteeGender, ImportantDateType } from '@tms/types';

const DEVOTEE_STATUSES = ['active', 'inactive', 'renewal_due'] as const satisfies readonly Devotee['status'][];
const GENDERS = ['male', 'female', 'other'] as const satisfies readonly DevoteeGender[];

class UpdateAddressDto {
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

class ImportantDateDto {
  @ApiPropertyOptional({ example: 'Birthday' })
  @IsString()
  label!: string;

  @ApiPropertyOptional({ example: '1985-03-15' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ enum: ['birthday', 'anniversary', 'star_day', 'other'] })
  @IsEnum(['birthday', 'anniversary', 'star_day', 'other'] as const)
  type!: ImportantDateType;
}

export class UpdateDevoteeDto {
  @ApiPropertyOptional({ example: 'Rajan' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Krishnamurthy' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional({ example: 'rajan@ex.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1 510-555-0191' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  country?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNri?: boolean;

  @ApiPropertyOptional()
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
  importantDates?: ImportantDateDto[];

  @ApiPropertyOptional({ example: 'Patron' })
  @IsOptional()
  @IsString()
  membershipTier?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  membershipExpiresAt?: string;

  @ApiPropertyOptional({ enum: DEVOTEE_STATUSES })
  @IsOptional()
  @IsEnum(DEVOTEE_STATUSES)
  status?: Devotee['status'];

  @ApiPropertyOptional({ type: UpdateAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAddressDto)
  address?: UpdateAddressDto;
}
