import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EventLifecycleStage } from '@tms/types';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class EventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EventLifecycleStage })
  @IsOptional()
  @IsEnum(EventLifecycleStage)
  stage?: EventLifecycleStage;
}
