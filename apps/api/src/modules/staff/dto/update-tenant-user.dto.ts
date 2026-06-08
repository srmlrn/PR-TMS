import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole, type TenantUserRole } from '@tms/types';

const TENANT_USER_ROLES: TenantUserRole[] = [
  UserRole.ADMIN,
  UserRole.FRONT_DESK,
  UserRole.PRIEST,
  UserRole.ACCOUNTANT,
  UserRole.VOLUNTEER,
  UserRole.DEVOTEE,
];

export class UpdateTenantUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ enum: TENANT_USER_ROLES })
  @IsOptional()
  @IsEnum(TENANT_USER_ROLES)
  role?: TenantUserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  staffId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
