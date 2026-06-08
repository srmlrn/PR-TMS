import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommitteeController } from './committee.controller';
import { CommitteeService } from './committee.service';

@Module({
  imports: [NotificationsModule],
  controllers: [CommitteeController],
  providers: [CommitteeService],
  exports: [CommitteeService],
})
export class CommitteeModule {}
