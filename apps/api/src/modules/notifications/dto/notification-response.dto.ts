import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@tms/types';

export class NotificationTemplateDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['email', 'sms'] })
  channel!: NotificationChannel;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiProperty()
  body!: string;
}

export class SendNotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['email', 'sms'] })
  channel!: NotificationChannel;

  @ApiProperty()
  to!: string;

  @ApiProperty({ enum: ['queued'] })
  status!: 'queued';

  @ApiPropertyOptional()
  templateId?: string;

  @ApiProperty()
  queuedAt!: string;
}
