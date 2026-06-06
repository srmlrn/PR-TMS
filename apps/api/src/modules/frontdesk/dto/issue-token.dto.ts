import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class IssueTokenDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID()
  devoteeId?: string;

  @ApiPropertyOptional({ example: 'Rajan Krishnamurthy' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  devoteeName?: string;
}
