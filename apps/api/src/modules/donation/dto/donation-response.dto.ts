import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, DonationFrequency } from '@tms/types';

export class DonationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  devoteeId!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty()
  purpose!: string;

  @ApiProperty({ enum: DonationFrequency })
  frequency!: DonationFrequency;

  @ApiProperty({ example: 'RCT-2026-0001' })
  receiptNumber!: string;

  @ApiProperty()
  taxCompliant!: boolean;

  @ApiPropertyOptional({ enum: ['irs_501c3', '80g', 'cra'] })
  taxDocType?: 'irs_501c3' | '80g' | 'cra';

  @ApiPropertyOptional()
  campaignId?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CampaignResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ example: 'Temple Renovation 2026' })
  name!: string;

  @ApiProperty()
  targetAmount!: number;

  @ApiProperty()
  raisedAmount!: number;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ example: 72 })
  progressPercent!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedDonationsDto {
  @ApiProperty({ type: [DonationResponseDto] })
  data!: DonationResponseDto[];

  @ApiProperty()
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
