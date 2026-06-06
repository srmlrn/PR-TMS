import { Module } from '@nestjs/common';
import { DevoteeModule } from '../devotee/devotee.module';
import { FrontDeskController } from './frontdesk.controller';
import { FrontDeskService } from './frontdesk.service';

@Module({
  imports: [DevoteeModule],
  controllers: [FrontDeskController],
  providers: [FrontDeskService],
  exports: [FrontDeskService],
})
export class FrontDeskModule {}
