import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DevoteeLookupDevoteeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Rajan Krishnamurthy' })
  name!: string;

  @ApiProperty({ example: '510-555-0191' })
  phone!: string;

  @ApiPropertyOptional({ example: 'Bharadwaja' })
  gotram?: string;

  @ApiPropertyOptional({ example: 'Rohini' })
  nakshatra?: string;

  @ApiPropertyOptional({ example: 'Patron' })
  membershipTier?: string;

  @ApiPropertyOptional({ example: 'Archana · 7 Jun 9:00 AM' })
  upcomingBooking?: string;
}

export class DevoteeLookupResponseDto {
  @ApiProperty()
  found!: boolean;

  @ApiPropertyOptional({ type: DevoteeLookupDevoteeDto })
  devotee?: DevoteeLookupDevoteeDto;
}

export class QueueTokenResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ example: 'A-054' })
  tokenNumber!: string;

  @ApiPropertyOptional()
  devoteeId?: string;

  @ApiPropertyOptional()
  devoteeName?: string;

  @ApiProperty({ example: 14 })
  position!: number;

  @ApiProperty({ example: 54 })
  queueSize!: number;

  @ApiProperty({ example: 22 })
  estimatedWaitMinutes!: number;

  @ApiProperty({ enum: ['waiting', 'called', 'served'] })
  status!: 'waiting' | 'called' | 'served';

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class QueueStatsResponseDto {
  @ApiProperty({ example: 54 })
  inQueue!: number;

  @ApiProperty({ example: 22 })
  averageWaitMinutes!: number;

  @ApiProperty({ example: 312 })
  servedToday!: number;
}
