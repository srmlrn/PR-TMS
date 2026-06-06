import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class LookupQueryDto {
  @ApiPropertyOptional({ example: '510-555-0191' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  phone?: string;

  @ApiPropertyOptional({ example: 'Rajan' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
