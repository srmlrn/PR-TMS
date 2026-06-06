import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateDonationDto } from './dto/create-donation.dto';
import {
  CampaignResponseDto,
  DonationResponseDto,
  PaginatedDonationsDto,
} from './dto/donation-response.dto';
import { DonationService } from './donation.service';

@ApiTags('Donations')
@Controller()
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post('donations')
  @ApiOperation({ summary: 'Record a new donation' })
  @ApiCreatedResponse({ type: DonationResponseDto })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateDonationDto,
  ): Promise<DonationResponseDto> {
    return this.donationService.createDonation(tenantId, dto);
  }

  @Get('donations')
  @ApiOperation({ summary: 'List donations for the tenant' })
  @ApiOkResponse({ type: PaginatedDonationsDto })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedDonationsDto> {
    return this.donationService.findDonations(
      tenantId,
      query.page,
      query.limit,
    );
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List active donation campaigns with progress' })
  @ApiOkResponse({ type: [CampaignResponseDto] })
  async findCampaigns(@TenantId() tenantId: string): Promise<CampaignResponseDto[]> {
    return this.donationService.findCampaigns(tenantId);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get a donation campaign by ID' })
  @ApiOkResponse({ type: CampaignResponseDto })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  async findCampaign(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<CampaignResponseDto> {
    return this.donationService.findCampaignById(tenantId, id);
  }
}
