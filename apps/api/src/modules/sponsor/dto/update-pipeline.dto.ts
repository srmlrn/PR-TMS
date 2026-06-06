import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SponsorPipelineStage } from '@tms/types';

export class UpdatePipelineDto {
  @ApiProperty({ enum: SponsorPipelineStage })
  @IsEnum(SponsorPipelineStage)
  pipelineStage!: SponsorPipelineStage;
}
