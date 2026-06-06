import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantEnvironment } from '@tms/types';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@svtemple.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'demo123' })
  @IsString()
  @MinLength(4)
  password!: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: TenantEnvironment, default: TenantEnvironment.PROD })
  @IsOptional()
  @IsEnum(TenantEnvironment)
  environment?: TenantEnvironment;
}
