import { Module } from '@nestjs/common';
import { DevoteeController } from './devotee.controller';
import { DevoteeService } from './devotee.service';

@Module({
  controllers: [DevoteeController],
  providers: [DevoteeService],
  exports: [DevoteeService],
})
export class DevoteeModule {}
