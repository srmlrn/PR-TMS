import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ReturnInspectionDto {
  @ApiProperty({ example: 46, minimum: 0 })
  @IsInt()
  @Min(0)
  returnedQuantity!: number;

  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  damagedQuantity!: number;

  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  missingQuantity!: number;
}
