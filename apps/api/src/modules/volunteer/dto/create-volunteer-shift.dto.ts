import { IsDateString, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVolunteerShiftDto {
  @ApiProperty({ example: 'Brahmotsavam Setup' })
  @IsString()
  @MaxLength(256)
  title!: string;

  @ApiProperty({ example: '2026-06-08' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  endTime!: string;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  slots!: number;
}
