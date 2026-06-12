import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CheckoutReceipt, QueueType, ShareCheckoutReceiptResult, UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CheckInBookingDto } from './dto/check-in.dto';
import { IssueTokenDto } from './dto/issue-token.dto';
import { LookupQueryDto } from './dto/lookup-query.dto';
import { PosCheckoutDto } from './dto/pos-checkout.dto';
import {
  DevoteeLookupResponseDto,
  QueueStatsResponseDto,
  QueueTokenResponseDto,
} from './dto/frontdesk-response.dto';
import { FrontDeskService } from './frontdesk.service';
import { CheckoutReceiptService } from './checkout-receipt.service';

@ApiTags('Front Desk')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
@Controller('frontdesk')
export class FrontDeskController {
  constructor(
    private readonly frontDeskService: FrontDeskService,
    private readonly checkoutReceiptService: CheckoutReceiptService,
  ) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Look up devotee by phone or name' })
  @ApiOkResponse({ type: DevoteeLookupResponseDto })
  async lookup(
    @TenantId() tenantId: string,
    @Query() query: LookupQueryDto,
  ): Promise<DevoteeLookupResponseDto> {
    return this.frontDeskService.lookupDevotee(tenantId, query);
  }

  @Get('devotee-profile/:id')
  @ApiOperation({ summary: 'Full devotee CRM profile for front desk' })
  async devoteeProfile(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.frontDeskService.getDevoteeProfile(tenantId, id);
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Check in devotee for a booking today' })
  async checkIn(@TenantId() tenantId: string, @Body() dto: CheckInBookingDto) {
    return this.frontDeskService.checkInBooking(tenantId, dto.bookingId);
  }

  @Get('queue')
  @ApiOperation({ summary: 'List queue tokens' })
  async listQueue(
    @TenantId() tenantId: string,
    @Query('status') status?: 'waiting' | 'called' | 'served',
    @Query('queueType') queueType?: QueueType,
  ) {
    return { data: await this.frontDeskService.listQueue(tenantId, { status, queueType }) };
  }

  @Public()
  @Get('display-board')
  @ApiOperation({ summary: 'Public TV display board payload (no auth, token numbers only)' })
  async displayBoard(@TenantId() tenantId: string) {
    return this.frontDeskService.getDisplayBoard(tenantId);
  }

  @Get('now-serving')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.PRIEST, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'Tokens currently called for display board' })
  async nowServing(@TenantId() tenantId: string) {
    return { data: await this.frontDeskService.getNowServing(tenantId) };
  }

  @Post('call-next')
  @ApiOperation({ summary: 'Call the next waiting token' })
  async callNext(
    @TenantId() tenantId: string,
    @Query('queueType') queueType?: QueueType,
  ) {
    const token = await this.frontDeskService.callNext(tenantId, queueType);
    return { data: token };
  }

  @Post('tokens/:id/call')
  @ApiOperation({ summary: 'Mark a token as called' })
  async callToken(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.frontDeskService.callToken(tenantId, id);
  }

  @Post('tokens/:id/serve')
  @ApiOperation({ summary: 'Mark a token as served' })
  async serveToken(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.frontDeskService.serveToken(tenantId, id);
  }

  @Post('tokens/:id/notify')
  @ApiOperation({ summary: 'Send SMS notification for queue token (stub)' })
  async notifyToken(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { phone: string },
  ) {
    return this.frontDeskService.notifyToken(tenantId, id, body.phone);
  }

  @Post('tokens')
  @ApiOperation({ summary: 'Issue a darshan queue token' })
  @ApiCreatedResponse({ type: QueueTokenResponseDto })
  async issueToken(
    @TenantId() tenantId: string,
    @Body() dto: IssueTokenDto,
  ): Promise<QueueTokenResponseDto> {
    return this.frontDeskService.issueToken(tenantId, dto);
  }

  @Get('queue-stats')
  @ApiOperation({ summary: 'Get current queue statistics' })
  @ApiOkResponse({ type: QueueStatsResponseDto })
  async getQueueStats(@TenantId() tenantId: string): Promise<QueueStatsResponseDto> {
    return this.frontDeskService.getQueueStats(tenantId);
  }

  @Post('pos-checkout')
  @ApiOperation({ summary: 'Unified counter POS checkout — mixed bookings, donations, and sales' })
  async posCheckout(@TenantId() tenantId: string, @Body() dto: PosCheckoutDto) {
    return this.frontDeskService.posCheckout(tenantId, dto);
  }

  @Get('checkout-receipts/:id')
  @ApiOperation({ summary: 'Itemized checkout invoice with all line items' })
  async getCheckoutReceipt(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<CheckoutReceipt> {
    return this.checkoutReceiptService.findOne(tenantId, id);
  }

  @Post('checkout-receipts/:id/share')
  @ApiOperation({ summary: 'Email invoice to devotee (or specified address)' })
  async shareCheckoutReceipt(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { email?: string },
  ): Promise<ShareCheckoutReceiptResult> {
    return this.checkoutReceiptService.shareByEmail(tenantId, id, body.email);
  }
}
