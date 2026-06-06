import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateChecklistItemDto {
  @ApiProperty({ description: 'Whether the checklist item is complete' })
  @IsBoolean()
  isDone!: boolean;
}
