import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FxRates, PaymentSession, UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('fx-rates')
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVOTEE,
    UserRole.FRONT_DESK,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get multi-currency FX rates (USD base)' })
  @ApiResponse({ status: 200, description: 'FX rate table' })
  getFxRates(): FxRates {
    return this.paymentService.getFxRates();
  }

  @Post('sessions')
  @Roles(UserRole.ADMIN, UserRole.DEVOTEE, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Create a payment checkout session' })
  @ApiResponse({ status: 201, description: 'Payment session created' })
  createSession(
    @TenantId() tenantId: string,
    @Body() dto: CreatePaymentSessionDto,
  ): PaymentSession {
    return this.paymentService.createSession(tenantId, dto);
  }

  @Post('sessions/:id/confirm')
  @Roles(UserRole.ADMIN, UserRole.DEVOTEE, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Confirm payment (demo/stripe/razorpay/cash)' })
  @ApiParam({ name: 'id', description: 'Payment session UUID' })
  @ApiResponse({ status: 200, description: 'Payment confirmed' })
  confirmSession(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): PaymentSession {
    return this.paymentService.confirmSession(tenantId, id);
  }

  @Get('sessions/:id')
  @Roles(UserRole.ADMIN, UserRole.DEVOTEE, UserRole.FRONT_DESK, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get payment session status' })
  @ApiParam({ name: 'id', description: 'Payment session UUID' })
  getSession(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): PaymentSession {
    return this.paymentService.getSession(tenantId, id);
  }
}
