import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateScheduleSettingsDto {
  @ApiPropertyOptional({ example: 9, description: 'Hour (0–23) when slots begin' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  openHour?: number;

  @ApiPropertyOptional({ example: 17, description: 'Hour (1–24) when slots end' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  closeHour?: number;

  @ApiPropertyOptional({ example: 30, description: 'Minutes between slot starts' })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(60)
  slotIntervalMinutes?: number;
}
