import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantContext, UserRole } from '@tms/types';
import { PlatformService } from './platform.service';
import { ProvisionEnvironmentDto } from './dto/provision-environment.dto';
import { PromoteEnvironmentDto } from './dto/promote-environment.dto';

@ApiTags('Platform')
@ApiBearerAuth()
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
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants (super-admin)' })
  listTenants() {
    return this.platformService.listTenants();
  }

  @Get('tenants/:tenantId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  getTenant(@Param('tenantId') tenantId: string) {
    return this.platformService.getTenant(tenantId);
  }

  @Get('tenants/:tenantId/environments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List environments for a tenant' })
  listEnvironments(@Param('tenantId') tenantId: string) {
    return this.platformService.listEnvironments(tenantId);
  }

  @Post('tenants/:tenantId/environments')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Provision a new environment (creates isolated database)' })
  provisionEnvironment(
    @Param('tenantId') tenantId: string,
    @Body() dto: ProvisionEnvironmentDto,
  ) {
    return this.platformService.provisionEnvironment(tenantId, dto);
  }

  @Post('tenants/:tenantId/environments/promote')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Promote config/data from one environment to another' })
  promoteEnvironment(
    @Param('tenantId') tenantId: string,
    @Body() dto: PromoteEnvironmentDto,
  ) {
    return this.platformService.promoteEnvironment(tenantId, dto);
  }

  @Get('tenants/:tenantId/usage')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Per-environment usage and estimated cost (metered billing)' })
  getUsage(@Param('tenantId') tenantId: string) {
    return this.platformService.getUsageByTenant(tenantId);
  }
}
