import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  FxRates,
  PaymentProvidersResponse,
  PaymentSession,
  UserRole,
} from '@tms/types';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import { PaymentService } from './payment.service';
import { StripeProvider } from './stripe.provider';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeProvider: StripeProvider,
  ) {}

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

  @Get('providers')
  @Roles(
    UserRole.ADMIN,
    UserRole.DEVOTEE,
    UserRole.FRONT_DESK,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List payment providers available per currency' })
  @ApiResponse({ status: 200, description: 'Provider map by currency' })
  getProviders(): PaymentProvidersResponse {
    return this.paymentService.getProvidersByCurrency();
  }

  @Post('sessions')
  @Roles(UserRole.ADMIN, UserRole.DEVOTEE, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Create a payment checkout session' })
  @ApiResponse({ status: 201, description: 'Payment session created' })
  createSession(
    @TenantId() tenantId: string,
    @Body() dto: CreatePaymentSessionDto,
  ): Promise<PaymentSession> {
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
  ): Promise<PaymentSession> {
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

  @Public()
  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Stripe webhook stub (payment_intent.succeeded)' })
  @ApiResponse({ status: 200, description: 'Webhook acknowledged' })
  handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): { received: boolean; sessionId?: string } {
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

    if (signature) {
      const event = this.stripeProvider.constructWebhookEvent(payload, signature);
      if (event?.type === 'payment_intent.succeeded') {
        const intent = event.data.object as { id: string };
        const session = this.paymentService.markSessionPaidByProviderRef(intent.id);
        return { received: true, sessionId: session?.id };
      }
      return { received: true };
    }

    const body = req.body as { type?: string; data?: { object?: { id?: string } } };
    if (body?.type === 'payment_intent.succeeded' && body.data?.object?.id) {
      const session = this.paymentService.markSessionPaidByProviderRef(body.data.object.id);
      return { received: true, sessionId: session?.id };
    }

    return { received: true };
  }

  @Public()
  @Post('webhooks/razorpay')
  @ApiOperation({ summary: 'Razorpay webhook stub (payment.captured)' })
  @ApiResponse({ status: 200, description: 'Webhook acknowledged' })
  handleRazorpayWebhook(
    @Body()
    body: {
      event?: string;
      payload?: { payment?: { entity?: { order_id?: string } } };
    },
  ): { received: boolean; sessionId?: string } {
    if (body?.event === 'payment.captured') {
      const orderId = body.payload?.payment?.entity?.order_id;
      if (orderId) {
        const session = this.paymentService.markSessionPaidByProviderRef(orderId);
        return { received: true, sessionId: session?.id };
      }
    }
    return { received: true };
  }
}
