import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreatePrasadamSponsorshipDto } from './dto/create-prasadam-sponsorship.dto';
import { SponsorshipQueryDto } from './dto/sponsorship-query.dto';
import { PrasadamService } from './prasadam.service';

@ApiTags('prasadam')
@Controller('prasadam')
export class PrasadamController {
  constructor(private readonly prasadamService: PrasadamService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Get prasadam sponsorship slot availability calendar' })
  @ApiResponse({ status: 200, description: 'Monthly slot availability by date/type/deity' })
  async getAvailability(
    @TenantId() tenantId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return { data: await this.prasadamService.getAvailability(tenantId, query) };
  }

  @Get('sponsorships')
  @ApiOperation({ summary: 'List prasadam sponsorships' })
  @ApiResponse({ status: 200, description: 'Paginated sponsorship list' })
  async findAll(@TenantId() tenantId: string, @Query() query: SponsorshipQueryDto) {
    return this.prasadamService.findAll(
      tenantId,
      query.page,
      query.limit,
      query.type,
      query.scheduledDate,
      query.deity,
    );
  }

  @Post('sponsorships')
  @ApiOperation({ summary: 'Book a prasadam sponsorship and trigger kitchen order' })
  @ApiResponse({ status: 201, description: 'Sponsorship booked with kitchen order ID' })
  @ApiResponse({ status: 409, description: 'Slot already booked for date/type/deity' })
  async createSponsorship(
    @TenantId() tenantId: string,
    @Body() dto: CreatePrasadamSponsorshipDto,
  ) {
    return this.prasadamService.createSponsorship(tenantId, dto);
  }
}
