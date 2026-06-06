import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { QueueType } from '@tms/types';

const QUEUE_TYPES = ['darshan', 'seva', 'priority'] as const satisfies readonly QueueType[];

export class IssueTokenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  devoteeId?: string;

  @ApiPropertyOptional({ example: 'Rajan Krishnamurthy' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  devoteeName?: string;

  @ApiPropertyOptional({ enum: QUEUE_TYPES, default: 'darshan' })
  @IsOptional()
  @IsEnum(QUEUE_TYPES)
  queueType?: QueueType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  priority?: boolean;
}
