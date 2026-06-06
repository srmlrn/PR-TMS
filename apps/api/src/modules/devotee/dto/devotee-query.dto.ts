import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class DevoteeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by first or last name', example: 'Rajan' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ description: 'Search by phone number', example: '510-555' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string;

  @ApiPropertyOptional({ description: 'Search by gotram', example: 'Bharadwaja' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  gotram?: string;
}
