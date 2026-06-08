import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { UserRole, type TenantUserRole } from '@tms/types';

const TENANT_USER_ROLES: TenantUserRole[] = [
  UserRole.ADMIN,
  UserRole.FRONT_DESK,
  UserRole.PRIEST,
  UserRole.ACCOUNTANT,
  UserRole.VOLUNTEER,
  UserRole.DEVOTEE,
];

export class CreateTenantUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiProperty({ enum: TENANT_USER_ROLES })
  @IsEnum(TENANT_USER_ROLES)
  role!: TenantUserRole;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;
}
