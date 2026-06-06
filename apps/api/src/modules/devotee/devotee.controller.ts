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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateDevoteeResponse, Devotee, PaginatedResponse, UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateDevoteeDto } from './dto/create-devotee.dto';
import { DevoteeQueryDto } from './dto/devotee-query.dto';
import { UpdateDevoteeDto } from './dto/update-devotee.dto';
import { DevoteeService } from './devotee.service';

@ApiTags('devotees')
@ApiBearerAuth()
@Controller('devotees')
export class DevoteeController {
  constructor(private readonly devoteeService: DevoteeService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.ACCOUNTANT)
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

  @Get('check-duplicate')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Check for existing devotee by phone or email' })
  @ApiResponse({ status: 200, description: 'Duplicate matches if any' })
  async checkDuplicate(
    @TenantId() tenantId: string,
    @Query('phone') phone?: string,
    @Query('email') email?: string,
  ) {
    return this.devoteeService.checkDuplicates(tenantId, phone, email);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.ACCOUNTANT, UserRole.DEVOTEE)
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
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Create a new devotee profile' })
  @ApiQuery({
    name: 'blockDuplicate',
    required: false,
    description: 'When true, return 409 if phone already exists',
    type: Boolean,
  })
  @ApiResponse({ status: 201, description: 'Devotee created' })
  @ApiResponse({ status: 409, description: 'Phone duplicate blocked' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateDevoteeDto,
    @Query('blockDuplicate') blockDuplicate?: string,
  ): Promise<CreateDevoteeResponse> {
    const { address, ...rest } = dto;
    return this.devoteeService.create(
      tenantId,
      {
        ...rest,
        address: address?.line1
          ? {
              line1: address.line1,
              line2: address.line2,
              city: address.city ?? '',
              state: address.state,
              postalCode: address.postalCode,
              country: address.country ?? rest.country,
            }
          : undefined,
      },
      {
        blockOnDuplicate: blockDuplicate === 'true' || blockDuplicate === '1',
      },
    );
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.DEVOTEE)
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
  @Roles(UserRole.ADMIN)
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
