import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateRentalOrderDto } from './dto/create-rental-order.dto';
import { ReturnInspectionDto } from './dto/return-inspection.dto';
import { RentalService } from './rental.service';

@ApiTags('rentals')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
@Controller()
export class RentalController {
  constructor(private readonly rentalService: RentalService) {}

  @Get('rental-assets')
  @ApiOperation({ summary: 'List rentable asset catalog' })
  @ApiResponse({ status: 200, description: 'Asset catalog with availability' })
  async getAssets(@TenantId() tenantId: string) {
    return { data: await this.rentalService.getAssets(tenantId) };
  }

  @Get('rental-orders')
  @ApiOperation({ summary: 'List rental orders' })
  @ApiResponse({ status: 200, description: 'Paginated rental orders' })
  async getOrders(@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.rentalService.getOrders(tenantId, query.page, query.limit);
  }

  @Post('rental-orders')
  @ApiOperation({ summary: 'Create a rental order and reserve assets' })
  @ApiResponse({ status: 201, description: 'Rental order created' })
  @ApiResponse({ status: 400, description: 'Insufficient asset availability' })
  async createOrder(@TenantId() tenantId: string, @Body() dto: CreateRentalOrderDto) {
    return this.rentalService.createOrder(tenantId, dto);
  }

  @Post('rental-orders/:id/return-inspection')
  @ApiOperation({ summary: 'Process return inspection with damage invoice calculation' })
  @ApiParam({ name: 'id', description: 'Rental order UUID' })
  @ApiResponse({ status: 201, description: 'Inspection processed with refund calculation' })
  @ApiResponse({ status: 404, description: 'Rental order not found' })
  async processReturnInspection(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReturnInspectionDto,
  ) {
    return this.rentalService.processReturnInspection(tenantId, id, dto);
  }
}
