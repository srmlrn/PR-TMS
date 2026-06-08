import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ADDRESS_TYPES,
  AddressType,
  DEVOTEE_TITLES,
  DevoteeTitle,
  EMAIL_TYPES,
  EmailType,
  PHONE_TYPES,
  PhoneType,
} from '@tms/types';

export class DevoteePhoneDto {
  @ApiProperty({ enum: PHONE_TYPES })
  @IsEnum(PHONE_TYPES)
  type!: PhoneType;

  @ApiProperty({ example: '+1 510-555-0191' })
  @IsString()
  @MinLength(1)
  number!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}

export class DevoteeEmailDto {
  @ApiProperty({ enum: EMAIL_TYPES })
  @IsEnum(EMAIL_TYPES)
  type!: EmailType;

  @ApiProperty({ example: 'devotee@example.com' })
  @IsEmail()
  address!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}

export class DevoteeAddressEntryDto {
  @ApiProperty({ enum: ADDRESS_TYPES })
  @IsEnum(ADDRESS_TYPES)
  type!: AddressType;

  @ApiProperty({ example: '123 Temple Way' })
  @IsString()
  @MinLength(1)
  line1!: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}

export class DevoteeTitleField {
  @ApiPropertyOptional({ enum: DEVOTEE_TITLES })
  @IsOptional()
  @IsEnum(DEVOTEE_TITLES)
  title?: DevoteeTitle;
}

export class DevoteeContactFieldsDto extends DevoteeTitleField {
  @ApiPropertyOptional({ example: 'TN' })
  @IsOptional()
  @IsString()
  indiaState?: string;

  @ApiPropertyOptional({ type: [DevoteePhoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevoteePhoneDto)
  phones?: DevoteePhoneDto[];

  @ApiPropertyOptional({ type: [DevoteeEmailDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevoteeEmailDto)
  emails?: DevoteeEmailDto[];

  @ApiPropertyOptional({ type: [DevoteeAddressEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevoteeAddressEntryDto)
  addresses?: DevoteeAddressEntryDto[];
}
