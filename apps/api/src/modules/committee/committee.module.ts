import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommitteeController } from './committee.controller';
import { CommitteePostgresRepository } from './committee-postgres.repository';
import { CommitteeService } from './committee.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [CommitteeController],
  providers: [CommitteePostgresRepository, CommitteeService],
  exports: [CommitteeService],
})
export class CommitteeModule {}
