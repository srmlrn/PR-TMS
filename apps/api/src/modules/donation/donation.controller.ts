import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUser, UserRole } from '@tms/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateDonationDto } from './dto/create-donation.dto';
import { DonationQueryDto } from './dto/donation-query.dto';
import {
  CampaignResponseDto,
  DonationResponseDto,
  PaginatedDonationsDto,
} from './dto/donation-response.dto';
import { generateReceiptPdf } from '../../common/utils/receipt-pdf.util';
import { generateTaxStatementPdf } from '../../common/utils/tax-statement-pdf.util';
import { DonationBillingService } from './donation-billing.service';
import { UpdateDonationSubscriptionDto } from './dto/update-donation-subscription.dto';
import { DonationService } from './donation.service';

@ApiTags('Donations')
@ApiBearerAuth()
@Controller()
export class DonationController {
  constructor(
    private readonly donationService: DonationService,
    private readonly donationBillingService: DonationBillingService,
  ) {}

  @Post('donations')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.ACCOUNTANT, UserRole.DEVOTEE)
  @ApiOperation({ summary: 'Record a new donation' })
  @ApiCreatedResponse({ type: DonationResponseDto })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateDonationDto,
  ): Promise<DonationResponseDto> {
    return this.donationService.createDonation(tenantId, dto);
  }

  @Get('donations')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FRONT_DESK, UserRole.DEVOTEE)
  @ApiOperation({ summary: 'List donations for the tenant' })
  @ApiOkResponse({ type: PaginatedDonationsDto })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: DonationQueryDto,
  ): Promise<PaginatedDonationsDto> {
    return this.donationService.findDonations(
      tenantId,
      query.page,
      query.limit,
      { devoteeId: query.devoteeId },
    );
  }

  @Get('campaigns')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FRONT_DESK, UserRole.DEVOTEE)
  @ApiOperation({ summary: 'List active donation campaigns with progress' })
  @ApiOkResponse({ type: [CampaignResponseDto] })
  async findCampaigns(@TenantId() tenantId: string): Promise<CampaignResponseDto[]> {
    return this.donationService.findCampaigns(tenantId);
  }

  @Get('donations/subscriptions')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DEVOTEE)
  @ApiOperation({ summary: 'List recurring donation subscriptions' })
  async listSubscriptions(
    @TenantId() tenantId: string,
    @Query('devoteeId') devoteeId?: string,
    @Query('status') status?: string,
  ) {
    return this.donationBillingService.findAll(tenantId, { devoteeId, status });
  }

  @Patch('donations/subscriptions/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Pause or cancel a recurring donation subscription' })
  async updateSubscription(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDonationSubscriptionDto,
  ) {
    return this.donationBillingService.updateSubscription(tenantId, id, dto);
  }

  @Get('donations/devotee/:devoteeId/annual-statement/file.pdf')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DEVOTEE, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Download annual tax giving statement as PDF' })
  async getAnnualStatementPdf(
    @TenantId() tenantId: string,
    @Param('devoteeId') devoteeId: string,
    @Query('year') year: string | undefined,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    if (user.role === UserRole.DEVOTEE && user.devoteeId !== devoteeId) {
      throw new ForbiddenException('You can only access your own tax statements');
    }
    const statement = await this.donationService.getAnnualTaxStatement(
      tenantId,
      devoteeId,
      year ? Number(year) : undefined,
    );
    const pdf = await generateTaxStatementPdf(statement);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tax-statement-${statement.year}.pdf"`,
    );
    res.send(pdf);
  }

  @Get('donations/devotee/:devoteeId/annual-statement')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DEVOTEE, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Annual tax giving statement for a devotee' })
  async getAnnualStatement(
    @TenantId() tenantId: string,
    @Param('devoteeId') devoteeId: string,
    @Query('year') year: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role === UserRole.DEVOTEE && user.devoteeId !== devoteeId) {
      throw new ForbiddenException('You can only access your own tax statements');
    }
    return this.donationService.getAnnualTaxStatement(
      tenantId,
      devoteeId,
      year ? Number(year) : undefined,
    );
  }

  @Get('donations/:id/receipt')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DEVOTEE, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Download tax receipt for a donation' })
  @ApiOkResponse({ description: 'Tax receipt JSON' })
  async getReceipt(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.donationService.getReceipt(tenantId, id);
  }

  @Get('donations/:id/receipt.pdf')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DEVOTEE, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Download tax receipt as PDF' })
  @ApiOkResponse({ description: 'PDF tax receipt' })
  async getReceiptPdf(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const receipt = await this.donationService.getReceipt(tenantId, id);
    const pdf = await generateReceiptPdf(receipt);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${receipt.receiptNumber}.pdf"`,
    );
    res.send(pdf);
  }

  @Get('campaigns/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FRONT_DESK, UserRole.DEVOTEE)
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
