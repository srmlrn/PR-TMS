import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@tms/types';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ enum: ['email', 'sms'] })
  @IsEnum(['email', 'sms'] as const)
  channel!: NotificationChannel;

  @ApiProperty({ example: '+1-408-555-0101' })
  @IsString()
  to!: string;

  @ApiPropertyOptional({ example: 'reminder-star-day' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
