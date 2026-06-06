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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateEventStageDto } from './dto/update-event-stage.dto';
import { EventService } from './event.service';

@ApiTags('events')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.VOLUNTEER, UserRole.ACCOUNTANT)
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  @ApiOperation({ summary: 'List events with optional stage filter' })
  @ApiResponse({ status: 200, description: 'Paginated event list' })
  async findAll(@TenantId() tenantId: string, @Query() query: EventQueryDto) {
    return this.eventService.findAll(
      tenantId,
      query.page,
      query.limit,
      query.stage,
    );
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Event pipeline kanban grouped by lifecycle stage' })
  @ApiResponse({ status: 200, description: 'Events grouped by stage' })
  async getPipeline(@TenantId() tenantId: string) {
    return this.eventService.getPipeline(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.eventService.findOne(tenantId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new event (starts at enquiry stage)' })
  @ApiResponse({ status: 201, description: 'Event created' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateEventDto) {
    return this.eventService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update event details' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event deleted' })
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.eventService.remove(tenantId, id);
    return { deleted: true };
  }

  @Patch(':id/stage')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Advance event lifecycle stage' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Stage updated' })
  async updateStage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventStageDto,
  ) {
    return this.eventService.updateStage(tenantId, id, dto.stage);
  }

  @Get(':id/checklist')
  @ApiOperation({ summary: 'Get event coordination checklist' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Checklist items' })
  async getChecklist(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.eventService.getChecklist(tenantId, id);
  }

  @Get(':id/budget')
  @ApiOperation({ summary: 'Get event budget snapshot (planned vs actual)' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Budget breakdown' })
  async getBudget(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.eventService.getBudget(tenantId, id);
  }
}
