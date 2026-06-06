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
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { SponsorQueryDto } from './dto/sponsor-query.dto';
import { UpdateRecognitionDto } from './dto/update-recognition.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import { SponsorService } from './sponsor.service';

@ApiTags('sponsors')
@Controller('sponsors')
export class SponsorController {
  constructor(private readonly sponsorService: SponsorService) {}

  @Get('renewals-due')
  @ApiOperation({ summary: 'List sponsors with renewals due within 90 days' })
  @ApiResponse({ status: 200, description: 'Sponsors due for renewal' })
  async getRenewalsDue(@TenantId() tenantId: string) {
    return { data: await this.sponsorService.getRenewalsDue(tenantId) };
  }

  @Get()
  @ApiOperation({ summary: 'List sponsors with optional tier/stage filters' })
  @ApiResponse({ status: 200, description: 'Paginated sponsor directory' })
  async findAll(@TenantId() tenantId: string, @Query() query: SponsorQueryDto) {
    return this.sponsorService.findAll(
      tenantId,
      query.page,
      query.limit,
      query.tier,
      query.pipelineStage,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sponsor by ID' })
  @ApiParam({ name: 'id', description: 'Sponsor UUID' })
  @ApiResponse({ status: 200, description: 'Sponsor profile' })
  @ApiResponse({ status: 404, description: 'Sponsor not found' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sponsorService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new sponsor to CRM' })
  @ApiResponse({ status: 201, description: 'Sponsor created with recognition checklist' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateSponsorDto) {
    return this.sponsorService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sponsor profile' })
  @ApiParam({ name: 'id', description: 'Sponsor UUID' })
  @ApiResponse({ status: 200, description: 'Sponsor updated' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSponsorDto,
  ) {
    return this.sponsorService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove sponsor from CRM' })
  @ApiParam({ name: 'id', description: 'Sponsor UUID' })
  @ApiResponse({ status: 200, description: 'Sponsor deleted' })
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.sponsorService.remove(tenantId, id);
    return { deleted: true };
  }

  @Get(':id/recognition')
  @ApiOperation({ summary: 'Get sponsor recognition checklist' })
  @ApiParam({ name: 'id', description: 'Sponsor UUID' })
  @ApiResponse({ status: 200, description: 'Recognition items and fulfillment status' })
  async getRecognition(@TenantId() tenantId: string, @Param('id') id: string) {
    return { data: await this.sponsorService.getRecognition(tenantId, id) };
  }

  @Patch(':id/recognition/:itemId')
  @ApiOperation({ summary: 'Update recognition item fulfillment status' })
  @ApiParam({ name: 'id', description: 'Sponsor UUID' })
  @ApiParam({ name: 'itemId', description: 'Recognition item UUID' })
  @ApiResponse({ status: 200, description: 'Recognition item updated' })
  async updateRecognition(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateRecognitionDto,
  ) {
    return this.sponsorService.updateRecognitionItem(
      tenantId,
      id,
      itemId,
      dto.isFulfilled,
    );
  }
}
