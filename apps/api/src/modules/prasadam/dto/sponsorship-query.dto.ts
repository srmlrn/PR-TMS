import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PrasadamSponsorshipType } from '@tms/types';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class SponsorshipQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PrasadamSponsorshipType })
  @IsOptional()
  @IsEnum(PrasadamSponsorshipType)
  type?: PrasadamSponsorshipType;

  @ApiPropertyOptional({ example: '2026-07-05' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: 'Lord Venkateswara' })
  @IsOptional()
  @IsString()
  deity?: string;
}
