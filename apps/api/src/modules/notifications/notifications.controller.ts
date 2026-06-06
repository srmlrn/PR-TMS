import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { SendNotificationDto } from './dto/send-notification.dto';
import {
  NotificationTemplateDto,
  SendNotificationResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'List notification templates' })
  @ApiOkResponse({ type: [NotificationTemplateDto] })
  getTemplates(): NotificationTemplateDto[] {
    return this.notificationsService.getTemplates();
  }

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Queue an email or SMS notification (stub logs to console)' })
  @ApiCreatedResponse({ type: SendNotificationResponseDto })
  send(@Body() dto: SendNotificationDto): SendNotificationResponseDto {
    return this.notificationsService.send(dto);
  }
}
