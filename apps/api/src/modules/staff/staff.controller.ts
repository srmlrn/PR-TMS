import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Staff, UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { StaffQueryDto } from './dto/staff-query.dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PRIEST, UserRole.FRONT_DESK, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'List temple staff, optionally filtered by role' })
  @ApiOkResponse({ description: 'Staff roster' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: StaffQueryDto,
  ): Promise<{ data: Staff[] }> {
    const data = await this.staffService.findAll(tenantId, query.role);
    return { data };
  }
}
