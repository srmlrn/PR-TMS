import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '@tms/types';
import { PlatformService } from './platform.service';
import { ProvisionEnvironmentDto } from './dto/provision-environment.dto';
import { PromoteEnvironmentDto } from './dto/promote-environment.dto';

@ApiTags('Platform')
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('context')
  @ApiOperation({ summary: 'Get resolved tenant + environment context for current request' })
  @ApiResponse({ status: 200, description: 'Active tenant context' })
  getContext(@TenantCtx() ctx: TenantContext) {
    return ctx;
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants (super-admin)' })
  listTenants() {
    return this.platformService.listTenants();
  }

  @Get('tenants/:tenantId')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  getTenant(@Param('tenantId') tenantId: string) {
    return this.platformService.getTenant(tenantId);
  }

  @Get('tenants/:tenantId/environments')
  @ApiOperation({ summary: 'List environments for a tenant' })
  listEnvironments(@Param('tenantId') tenantId: string) {
    return this.platformService.listEnvironments(tenantId);
  }

  @Post('tenants/:tenantId/environments')
  @ApiOperation({ summary: 'Provision a new environment (creates isolated database)' })
  provisionEnvironment(
    @Param('tenantId') tenantId: string,
    @Body() dto: ProvisionEnvironmentDto,
  ) {
    return this.platformService.provisionEnvironment(tenantId, dto);
  }

  @Post('tenants/:tenantId/environments/promote')
  @ApiOperation({ summary: 'Promote config/data from one environment to another' })
  promoteEnvironment(
    @Param('tenantId') tenantId: string,
    @Body() dto: PromoteEnvironmentDto,
  ) {
    return this.platformService.promoteEnvironment(tenantId, dto);
  }

  @Get('tenants/:tenantId/usage')
  @ApiOperation({ summary: 'Per-environment usage and estimated cost (metered billing)' })
  getUsage(@Param('tenantId') tenantId: string) {
    return this.platformService.getUsageByTenant(tenantId);
  }
}
