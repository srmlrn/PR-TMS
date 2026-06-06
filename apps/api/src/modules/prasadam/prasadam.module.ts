import { Module } from '@nestjs/common';
import { PrasadamController } from './prasadam.controller';
import { PrasadamService } from './prasadam.service';

@Module({
  controllers: [PrasadamController],
  providers: [PrasadamService],
  exports: [PrasadamService],
})
export class PrasadamModule {}
