import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class RentalAssetLineDto {
  @ApiProperty({ description: 'Rental asset UUID' })
  @IsString()
  assetId!: string;

  @ApiProperty({ example: 48, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
