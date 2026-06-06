import { Module } from '@nestjs/common';
import { DevoteeController } from './devotee.controller';
import { DevoteeReminderService } from './devotee-reminder.service';
import { DevoteeService } from './devotee.service';

@Module({
  controllers: [DevoteeController],
  providers: [DevoteeService, DevoteeReminderService],
  exports: [DevoteeService],
})
export class DevoteeModule {}
