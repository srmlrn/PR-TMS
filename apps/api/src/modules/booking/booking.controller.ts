import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Booking, PaginatedResponse, SevaService, UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { BookingQueryDto, ServiceSlotsQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { generateReceiptPdf } from '../../common/utils/receipt-pdf.util';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingService } from './booking.service';
import { SevaCatalogService, TimeSlot } from './seva-catalog.service';

@ApiTags('bookings')
@ApiBearerAuth()
@Roles(
  UserRole.ADMIN,
  UserRole.FRONT_DESK,
  UserRole.PRIEST,
  UserRole.DEVOTEE,
  UserRole.ACCOUNTANT,
)
@Controller()
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly sevaCatalogService: SevaCatalogService,
  ) {}

  @Get('bookings')
  @ApiOperation({ summary: 'List bookings with optional date and devotee filters' })
  @ApiResponse({ status: 200, description: 'Paginated booking list' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: BookingQueryDto,
  ): Promise<PaginatedResponse<Booking>> {
    return this.bookingService.findAll(
      tenantId,
      query.page,
      query.limit,
      {
        date: query.date,
        devoteeId: query.devoteeId,
      },
    );
  }

  @Get('bookings/honorarium')
  @Roles(UserRole.PRIEST, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Total honorarium for completed sevas on a date' })
  async getHonorarium(
    @TenantId() tenantId: string,
    @Query('date') date?: string,
  ) {
    const target = date ?? new Date().toISOString().slice(0, 10);
    const total = await this.bookingService.getHonorariumTotal(tenantId, target);
    return { date: target, total, currency: 'USD' };
  }

  @Get('bookings/:id/receipt')
  @Roles(UserRole.ADMIN, UserRole.DEVOTEE, UserRole.FRONT_DESK, UserRole.PRIEST)
  @ApiOperation({ summary: 'Get booking payment receipt' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  async getReceipt(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.bookingService.getReceipt(tenantId, id);
  }

  @Get('bookings/:id/receipt.pdf')
  @Roles(UserRole.ADMIN, UserRole.DEVOTEE, UserRole.FRONT_DESK, UserRole.PRIEST)
  @ApiOperation({ summary: 'Download booking receipt as PDF' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  async getReceiptPdf(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const receipt = await this.bookingService.getReceipt(tenantId, id);
    const pdf = await generateReceiptPdf(receipt);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${receipt.receiptNumber}.pdf"`,
    );
    res.send(pdf);
  }

  @Patch('bookings/:id')
  @Roles(UserRole.ADMIN, UserRole.PRIEST)
  @ApiOperation({ summary: 'Update booking (e.g. assign priest)' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<Booking> {
    return this.bookingService.update(tenantId, id, dto);
  }

  @Patch('bookings/:id/status')
  @Roles(UserRole.PRIEST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update booking status (e.g. mark seva complete)' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  async updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    return this.bookingService.updateStatus(tenantId, id, dto.status);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Create a seva booking with optional sankalpa' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 404, description: 'Devotee or service not found' })
  @ApiResponse({ status: 409, description: 'Time slot conflict' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateBookingDto,
  ): Promise<Booking> {
    return this.bookingService.create(tenantId, dto);
  }

  @Get('services')
  @ApiOperation({ summary: 'List active seva services' })
  @ApiResponse({ status: 200, description: 'Seva catalog' })
  async findServices(@TenantId() tenantId: string): Promise<SevaService[]> {
    return this.sevaCatalogService.findAll(tenantId);
  }

  @Get('services/:id/slots')
  @ApiOperation({ summary: 'Get available time slots for a service on a date' })
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiResponse({ status: 200, description: 'Available and booked slots' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceSlots(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: ServiceSlotsQueryDto,
  ): Promise<{ serviceId: string; date: string; slots: TimeSlot[] }> {
    return this.bookingService.getServiceSlots(tenantId, id, query.date);
  }
}
