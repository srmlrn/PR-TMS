import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SankalpaDto {
  @ApiProperty({ example: 'Rajan Krishnamurthy' })
  @IsString()
  sponsorName!: string;

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

  @ApiPropertyOptional({ example: 'Birthday' })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ example: 'Rajan Krishnamurthy' })
  @IsOptional()
  @IsString()
  beneficiaryName?: string;
}
