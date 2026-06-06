import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class DonationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter donations by devotee UUID' })
  @IsOptional()
  @IsUUID()
  devoteeId?: string;
}
