import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@tms/types';

export class FinanceSummaryResponseDto {
  @ApiProperty({ example: 54_200 })
  incomeMtd!: number;

  @ApiProperty({ example: 14_800 })
  expensesMtd!: number;

  @ApiProperty({ example: 2_400 })
  receivables!: number;

  @ApiProperty({ example: 3_900 })
  payables!: number;

  @ApiProperty({ enum: Currency })
  currency!: Currency;
}

export class VendorPaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  vendorId!: string;

  @ApiProperty({ example: 'Fresh Flowers Co.' })
  vendorName!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty()
  dueDate!: Date;

  @ApiProperty({ enum: ['pending', 'paid', 'overdue'] })
  status!: 'pending' | 'paid' | 'overdue';

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class TaxComplianceResponseDto {
  @ApiProperty({ enum: ['usa', 'india', 'canada'] })
  jurisdiction!: 'usa' | 'india' | 'canada';

  @ApiProperty({ example: 'USA — IRS statements ready' })
  label!: string;

  @ApiProperty({ example: 148 })
  readyCount!: number;

  @ApiProperty({ example: 0 })
  pendingCount!: number;
}

export class PaginatedVendorPaymentsDto {
  @ApiProperty({ type: [VendorPaymentResponseDto] })
  data!: VendorPaymentResponseDto[];

  @ApiProperty()
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
