import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EventLifecycleStage } from '@tms/types';

export class UpdateEventStageDto {
  @ApiProperty({ enum: EventLifecycleStage, example: EventLifecycleStage.CONFIRMED })
  @IsEnum(EventLifecycleStage)
  stage!: EventLifecycleStage;
}
