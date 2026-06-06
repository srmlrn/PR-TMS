import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LookupQueryDto {
  @ApiProperty({ example: '510-555-0191', description: 'Devotee phone number' })
  @IsString()
  @MinLength(3)
  phone!: string;
}
