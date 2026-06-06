import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUser, InAppNotification, UserRole } from '@tms/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
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

  @Get('in-app')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'List in-app notifications for current user' })
  @ApiOkResponse({ description: 'In-app notification feed' })
  listInApp(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): { data: InAppNotification[] } {
    return {
      data: this.notificationsService.listInAppForUser(tenantId, user.id),
    };
  }

  @Patch('in-app/:id/read')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Mark an in-app notification as read' })
  @ApiOkResponse({ description: 'Updated notification' })
  markRead(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): InAppNotification {
    return this.notificationsService.markInAppRead(tenantId, user.id, id);
  }

  @Patch('in-app/read-all')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Mark all in-app notifications as read' })
  @ApiOkResponse({ description: 'Count of notifications marked read' })
  markAllRead(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): { updated: number } {
    return this.notificationsService.markAllInAppRead(tenantId, user.id);
  }
}
