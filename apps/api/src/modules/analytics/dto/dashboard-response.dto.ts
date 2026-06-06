import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@tms/types';

export class DonationsMtdSummaryDto {
  @ApiProperty()
  count!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ enum: Currency })
  currency!: Currency;
}

export class QueueStatsDto {
  @ApiProperty()
  inQueue!: number;

  @ApiProperty()
  averageWaitMinutes!: number;

  @ApiProperty()
  servedToday!: number;
}

export class DashboardAnalyticsResponseDto {
  @ApiProperty()
  devotees!: number;

  @ApiProperty()
  bookingsToday!: number;

  @ApiProperty({ type: DonationsMtdSummaryDto })
  donationsMtd!: DonationsMtdSummaryDto;

  @ApiProperty({ type: QueueStatsDto })
  queue!: QueueStatsDto;
}
