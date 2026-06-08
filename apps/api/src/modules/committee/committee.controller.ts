import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  Committee,
  CommitteeCalendarBlock,
  CommitteeDashboard,
  CommitteeLeadershipRecord,
  CommitteeMember,
  CommitteeMessage,
  CommitteeReport,
  CommitteeRequest,
  CommitteeRoster,
  CommitteeTarget,
  CommitteeTask,
  UserRole,
} from '@tms/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  CreateCommitteeCalendarBlockDto,
  UpdateCommitteeCalendarBlockDto,
} from './dto/committee-calendar-block.dto';
import {
  CreateCommitteeMemberDto,
  UpdateCommitteeMemberDto,
} from './dto/committee-member.dto';
import { CreateCommitteeMessageDto } from './dto/committee-message.dto';
import {
  CreateCommitteeRequestDto,
  UpdateCommitteeRequestDto,
} from './dto/committee-request.dto';
import {
  CreateCommitteeTargetDto,
  UpdateCommitteeTargetDto,
} from './dto/committee-target.dto';
import {
  CreateCommitteeTaskDto,
  UpdateCommitteeTaskDto,
} from './dto/committee-task.dto';
import {
  CommitteeQueryDto,
  CommitteeScopeQueryDto,
  CreateCommitteeDto,
  UpdateCommitteeDto,
} from './dto/create-committee.dto';
import { CreateCommitteeReportDto } from './dto/committee-report.dto';
import { CommitteeService } from './committee.service';

@ApiTags('committees')
@ApiBearerAuth()
@Controller('committees')
@Roles(UserRole.ADMIN, UserRole.COMMITTEE)
export class CommitteeController {
  constructor(private readonly committeeService: CommitteeService) {}

  @Get()
  @ApiOperation({ summary: 'List committees' })
  @ApiOkResponse({ description: 'Committee list' })
  async findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: CommitteeQueryDto,
  ): Promise<{ data: Committee[] }> {
    const mine = query.mine === true || String(query.mine) === 'true';
    const data = await this.committeeService.findAll(tenantId, user, { mine });
    return { data };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create committee' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCommitteeDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Committee> {
    return this.committeeService.create(tenantId, dto, user);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Committee portal dashboard summary' })
  async dashboard(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: CommitteeScopeQueryDto,
  ): Promise<CommitteeDashboard> {
    return this.committeeService.getDashboard(tenantId, user, {
      committeeId: query.committeeId,
    });
  }

  @Get('my/tasks')
  @ApiOperation({ summary: 'My assigned tasks across committees' })
  async myTasks(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: CommitteeScopeQueryDto,
  ): Promise<{ data: CommitteeTask[] }> {
    const data = await this.committeeService.findMyTasks(tenantId, user, {
      committeeId: query.committeeId,
    });
    return { data };
  }

  @Get('my/blocks')
  @ApiOperation({ summary: 'Calendar blocks across my committees' })
  async myBlocks(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: CommitteeScopeQueryDto,
  ): Promise<{ data: CommitteeCalendarBlock[] }> {
    const data = await this.committeeService.findMyBlocks(tenantId, user, {
      committeeId: query.committeeId,
    });
    return { data };
  }

  @Get('my/requests')
  @ApiOperation({ summary: 'My submitted requests across committees' })
  async myRequests(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: CommitteeScopeQueryDto,
  ): Promise<{ data: CommitteeRequest[] }> {
    const data = await this.committeeService.findMyRequests(tenantId, user, {
      committeeId: query.committeeId,
    });
    return { data };
  }

  @Get('my/pending-approvals')
  @ApiOperation({ summary: 'Pending requests awaiting chair approval' })
  async pendingApprovals(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: CommitteeScopeQueryDto,
  ): Promise<{ data: CommitteeRequest[] }> {
    const data = await this.committeeService.findPendingApprovals(tenantId, user, {
      committeeId: query.committeeId,
    });
    return { data };
  }

  @Get('roster')
  @ApiOperation({ summary: 'Public committee roster grouped by category' })
  async roster(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeRoster> {
    return this.committeeService.getRoster(tenantId, user);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Committee reports across accessible committees' })
  async allReports(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: CommitteeReport[] }> {
    const data = await this.committeeService.findAllReports(tenantId, user);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get committee by id' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Committee> {
    return this.committeeService.findOne(tenantId, id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update committee' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCommitteeDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Committee> {
    return this.committeeService.update(tenantId, id, dto, user);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Dashboard for a specific committee' })
  async committeeDashboard(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeDashboard> {
    return this.committeeService.getDashboard(tenantId, user, { committeeId: id });
  }

  @Get(':id/members')
  async findMembers(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: CommitteeMember[] }> {
    const data = await this.committeeService.findMembers(tenantId, id, user);
    return { data };
  }

  @Post(':id/members')
  async addMember(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommitteeMemberDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeMember> {
    return this.committeeService.addMember(tenantId, id, dto, user);
  }

  @Patch(':id/members/:memberId')
  async updateMember(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateCommitteeMemberDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeMember> {
    return this.committeeService.updateMember(tenantId, id, memberId, dto, user);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ deleted: boolean }> {
    return this.committeeService.removeMember(tenantId, id, memberId, user);
  }

  @Get(':id/calendar-blocks')
  async findBlocks(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: CommitteeCalendarBlock[] }> {
    const data = await this.committeeService.findBlocks(tenantId, id, user);
    return { data };
  }

  @Post(':id/calendar-blocks')
  async createBlock(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommitteeCalendarBlockDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeCalendarBlock> {
    return this.committeeService.createBlock(tenantId, id, dto, user);
  }

  @Patch(':id/calendar-blocks/:blockId')
  async updateBlock(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpdateCommitteeCalendarBlockDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeCalendarBlock> {
    return this.committeeService.updateBlock(tenantId, id, blockId, dto, user);
  }

  @Delete(':id/calendar-blocks/:blockId')
  async deleteBlock(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ deleted: boolean }> {
    return this.committeeService.deleteBlock(tenantId, id, blockId, user);
  }

  @Get(':id/tasks')
  async findTasks(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: CommitteeTask[] }> {
    const data = await this.committeeService.findTasks(tenantId, id, user);
    return { data };
  }

  @Post(':id/tasks')
  async createTask(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommitteeTaskDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeTask> {
    return this.committeeService.createTask(tenantId, id, dto, user);
  }

  @Patch(':id/tasks/:taskId')
  async updateTask(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateCommitteeTaskDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeTask> {
    return this.committeeService.updateTask(tenantId, id, taskId, dto, user);
  }

  @Get(':id/targets')
  async findTargets(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: CommitteeTarget[] }> {
    const data = await this.committeeService.findTargets(tenantId, id, user);
    return { data };
  }

  @Post(':id/targets')
  async createTarget(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommitteeTargetDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeTarget> {
    return this.committeeService.createTarget(tenantId, id, dto, user);
  }

  @Patch(':id/targets/:targetId')
  async updateTarget(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('targetId') targetId: string,
    @Body() dto: UpdateCommitteeTargetDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeTarget> {
    return this.committeeService.updateTarget(tenantId, id, targetId, dto, user);
  }

  @Get(':id/requests')
  async findRequests(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: CommitteeRequest[] }> {
    const data = await this.committeeService.findRequests(tenantId, id, user);
    return { data };
  }

  @Post(':id/requests')
  async createRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommitteeRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeRequest> {
    return this.committeeService.createRequest(tenantId, id, dto, user);
  }

  @Patch(':id/requests/:requestId')
  async updateRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateCommitteeRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeRequest> {
    return this.committeeService.updateRequest(tenantId, id, requestId, dto, user);
  }

  @Get(':id/messages')
  async findMessages(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: CommitteeMessage[] }> {
    const data = await this.committeeService.findMessages(tenantId, id, user);
    return { data };
  }

  @Post(':id/messages')
  async createMessage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommitteeMessageDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeMessage> {
    return this.committeeService.createMessage(tenantId, id, dto, user);
  }

  @Get(':id/reports')
  @ApiOperation({ summary: 'Committee meeting reports' })
  async findReports(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: CommitteeReport[] }> {
    const data = await this.committeeService.findReports(tenantId, id, user);
    return { data };
  }

  @Post(':id/reports')
  @ApiOperation({ summary: 'Create committee meeting report' })
  async createReport(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommitteeReportDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommitteeReport> {
    return this.committeeService.createReport(tenantId, id, dto, user);
  }

  @Get(':id/leadership-history')
  @ApiOperation({ summary: 'Past committee leadership' })
  async leadershipHistory(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: CommitteeLeadershipRecord[] }> {
    const data = await this.committeeService.findLeadershipHistory(tenantId, id, user);
    return { data };
  }
}
