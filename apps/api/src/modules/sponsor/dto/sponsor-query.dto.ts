import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SponsorPipelineStage, SponsorTier } from '@tms/types';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class SponsorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SponsorTier })
  @IsOptional()
  @IsEnum(SponsorTier)
  tier?: SponsorTier;

  @ApiPropertyOptional({ enum: SponsorPipelineStage })
  @IsOptional()
  @IsEnum(SponsorPipelineStage)
  pipelineStage?: SponsorPipelineStage;
}
