import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateRecognitionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isFulfilled!: boolean;
}
