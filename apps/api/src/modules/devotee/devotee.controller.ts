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
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Devotee, PaginatedResponse } from '@tms/types';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateDevoteeDto } from './dto/create-devotee.dto';
import { DevoteeQueryDto } from './dto/devotee-query.dto';
import { UpdateDevoteeDto } from './dto/update-devotee.dto';
import { DevoteeService } from './devotee.service';

@ApiTags('devotees')
@Controller('devotees')
export class DevoteeController {
  constructor(private readonly devoteeService: DevoteeService) {}

  @Get()
  @ApiOperation({ summary: 'List devotees with optional search filters' })
  @ApiResponse({ status: 200, description: 'Paginated devotee list' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: DevoteeQueryDto,
  ): Promise<PaginatedResponse<Devotee>> {
    return this.devoteeService.findAll(
      tenantId,
      query.page,
      query.limit,
      {
        name: query.name,
        phone: query.phone,
        gotram: query.gotram,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get devotee by ID' })
  @ApiParam({ name: 'id', description: 'Devotee UUID' })
  @ApiResponse({ status: 200, description: 'Devotee details' })
  @ApiResponse({ status: 404, description: 'Devotee not found' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<Devotee> {
    return this.devoteeService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new devotee profile' })
  @ApiResponse({ status: 201, description: 'Devotee created' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateDevoteeDto,
  ): Promise<Devotee> {
    return this.devoteeService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update devotee profile' })
  @ApiParam({ name: 'id', description: 'Devotee UUID' })
  @ApiResponse({ status: 200, description: 'Devotee updated' })
  @ApiResponse({ status: 404, description: 'Devotee not found' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDevoteeDto,
  ): Promise<Devotee> {
    return this.devoteeService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a devotee profile' })
  @ApiParam({ name: 'id', description: 'Devotee UUID' })
  @ApiResponse({ status: 200, description: 'Devotee deleted' })
  @ApiResponse({ status: 404, description: 'Devotee not found' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ deleted: true }> {
    await this.devoteeService.remove(tenantId, id);
    return { deleted: true };
  }
}
