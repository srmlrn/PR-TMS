import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DevoteeController } from './devotee.controller';
import { DevoteeReminderService } from './devotee-reminder.service';
import { DevoteeService } from './devotee.service';

@Module({
  imports: [NotificationsModule],
  controllers: [DevoteeController],
  providers: [DevoteeService, DevoteeReminderService],
  exports: [DevoteeService],
})
export class DevoteeModule {}
