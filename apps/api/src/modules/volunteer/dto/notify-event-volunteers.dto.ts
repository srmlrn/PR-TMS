import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { VolunteerNotifyAudience } from '@tms/types';

const AUDIENCES = ['interested', 'assigned'] as const satisfies readonly VolunteerNotifyAudience[];

export class NotifyEventVolunteersDto {
  @ApiPropertyOptional({
    enum: AUDIENCES,
    default: 'interested',
    description:
      'interested = volunteers matching seva preferences; assigned = confirmed roster for this event',
  })
  @IsOptional()
  @IsIn(AUDIENCES)
  audience?: VolunteerNotifyAudience;
}
