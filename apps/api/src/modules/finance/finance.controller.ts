import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  FinanceSummaryResponseDto,
  PaginatedVendorPaymentsDto,
  TaxComplianceResponseDto,
} from './dto/finance-response.dto';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get finance dashboard summary' })
  @ApiOkResponse({ type: FinanceSummaryResponseDto })
  async getSummary(@TenantId() tenantId: string): Promise<FinanceSummaryResponseDto> {
    return this.financeService.getSummary(tenantId);
  }

  @Get('vendor-payments')
  @ApiOperation({ summary: 'List vendor payments due' })
  @ApiOkResponse({ type: PaginatedVendorPaymentsDto })
  async getVendorPayments(
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedVendorPaymentsDto> {
    return this.financeService.getVendorPayments(
      tenantId,
      query.page,
      query.limit,
    );
  }

  @Get('tax-compliance')
  @ApiOperation({ summary: 'Get tax compliance status by jurisdiction' })
  @ApiOkResponse({ type: [TaxComplianceResponseDto] })
  async getTaxCompliance(
    @TenantId() tenantId: string,
  ): Promise<TaxComplianceResponseDto[]> {
    return this.financeService.getTaxCompliance(tenantId);
  }
}
