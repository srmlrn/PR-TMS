import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { DashboardAnalyticsResponseDto } from './dto/dashboard-response.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard aggregate counts' })
  @ApiOkResponse({ type: DashboardAnalyticsResponseDto })
  async getDashboard(
    @TenantId() tenantId: string,
  ): Promise<DashboardAnalyticsResponseDto> {
    return this.analyticsService.getDashboard(tenantId);
  }
}
