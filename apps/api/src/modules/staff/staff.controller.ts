import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  Staff,
  StaffLeave,
  UserRole,
} from '@tms/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateStaffLeaveDto } from './dto/create-staff-leave.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { StaffLeaveQueryDto } from './dto/staff-leave-query.dto';
import { StaffQueryDto } from './dto/staff-query.dto';
import { UpdateStaffLeaveDto } from './dto/update-staff-leave.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffLeaveService } from './staff-leave.service';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly leaveService: StaffLeaveService,
  ) {}

  @Get('leaves')
  @Roles(UserRole.ADMIN, UserRole.PRIEST)
  @ApiOperation({ summary: 'List staff leave requests' })
  @ApiOkResponse({ description: 'Leave records' })
  async findLeaves(
    @TenantId() tenantId: string,
    @Query() query: StaffLeaveQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: StaffLeave[] }> {
    let staffId = query.staffId;
    if (user.role === UserRole.PRIEST) {
      staffId = (await this.staffService.resolveStaffIdForUser(tenantId, user)) ?? staffId;
    }
    const data = await this.leaveService.findAll(tenantId, { ...query, staffId });
    return { data };
  }

  @Post('leaves')
  @Roles(UserRole.ADMIN, UserRole.PRIEST)
  @ApiOperation({ summary: 'Request staff leave' })
  @ApiOkResponse({ description: 'Created leave request' })
  async createLeave(
    @TenantId() tenantId: string,
    @Body() dto: CreateStaffLeaveDto,
    @CurrentUser() user: AuthUser,
  ): Promise<StaffLeave> {
    return this.leaveService.create(tenantId, dto, user);
  }

  @Patch('leaves/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve, reject, or cancel leave' })
  @ApiOkResponse({ description: 'Updated leave' })
  async updateLeave(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffLeaveDto,
  ): Promise<StaffLeave> {
    return this.leaveService.update(tenantId, id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PRIEST, UserRole.FRONT_DESK, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'List temple staff, optionally filtered by role' })
  @ApiOkResponse({ description: 'Staff roster' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: StaffQueryDto,
  ): Promise<{ data: Staff[] }> {
    const data = await this.staffService.findAll(tenantId, {
      role: query.role,
      includeInactive: query.includeInactive,
    });
    return { data };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PRIEST, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Get staff member by id' })
  @ApiOkResponse({ description: 'Staff record' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<Staff> {
    return this.staffService.findOne(tenantId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add staff member' })
  @ApiOkResponse({ description: 'Created staff' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateStaffDto,
  ): Promise<Staff> {
    return this.staffService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update staff member' })
  @ApiOkResponse({ description: 'Updated staff' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<Staff> {
    return this.staffService.update(tenantId, id, dto);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate staff member' })
  @ApiOkResponse({ description: 'Deactivated staff' })
  async deactivate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<Staff> {
    return this.staffService.deactivate(tenantId, id);
  }
}
