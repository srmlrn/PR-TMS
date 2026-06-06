import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Booking, PaginatedResponse, SevaService } from '@tms/types';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { BookingQueryDto, ServiceSlotsQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingService } from './booking.service';
import { SevaCatalogService, TimeSlot } from './seva-catalog.service';

@ApiTags('bookings')
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
