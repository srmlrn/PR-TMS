import {
  Body,
  Controller,
  Get,
  Headers,
  Optional,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
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
  TenantContext,
  TenantEnvironment,
  UserRole,
} from '@tms/types';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { TenantResolverService } from '../../database/tenant-resolver.service';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import { PaymentService } from './payment.service';
import { razorpayWebhookSecret } from './payment-config';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';
import { TenantPaymentSettingsService } from '../settings/tenant-payment-settings.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeProvider: StripeProvider,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly paymentSettings: TenantPaymentSettingsService,
    @Optional() private readonly tenantResolver?: TenantResolverService,
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
  @ApiOperation({ summary: 'Confirm payment (demo/cash only)' })
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
  @ApiOperation({ summary: 'Get payment session status (poll after client checkout)' })
  @ApiParam({ name: 'id', description: 'Payment session UUID' })
  getSession(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<PaymentSession> {
    return this.paymentService.getSession(tenantId, id);
  }

  @Public()
  @Get('sessions/:id/public-checkout')
  @ApiOperation({
    summary: 'Public mobile checkout session (QR scan — Apple Pay / Google Pay / card)',
  })
  @ApiParam({ name: 'id', description: 'Payment session UUID' })
  getPublicCheckout(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<PaymentSession> {
    return this.paymentService.getPublicCheckoutSession(tenantId, id);
  }

  @Public()
  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Stripe webhook (payment_intent.succeeded)' })
  @ApiResponse({ status: 200, description: 'Webhook acknowledged' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean; sessionId?: string }> {
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

    const body = req.body as {
      type?: string;
      data?: { object?: { id?: string; metadata?: { tenantId?: string; sessionId?: string } } };
    };
    const intent = body?.data?.object;
    const tenantId = intent?.metadata?.tenantId;

    if (tenantId) {
      const config = await this.paymentSettings.resolveStripeConfigForTenant(tenantId);
      if (config.webhookSecret) {
        if (!signature) {
          throw new UnauthorizedException('Missing stripe-signature header');
        }
        const event = await this.stripeProvider.constructWebhookEvent(
          tenantId,
          payload,
          signature,
        );
        if (event.type === 'payment_intent.succeeded') {
          const paidIntent = event.data.object as {
            id: string;
            metadata?: { tenantId?: string; sessionId?: string };
          };
          return this.markStripePaid(paidIntent);
        }
        return { received: true };
      }
    }

    if (body?.type === 'payment_intent.succeeded' && intent?.id) {
      return this.markStripePaid(intent as { id: string; metadata?: { tenantId?: string; sessionId?: string } });
    }

    return { received: true };
  }

  @Public()
  @Post('webhooks/razorpay')
  @ApiOperation({ summary: 'Razorpay webhook (payment.captured)' })
  @ApiResponse({ status: 200, description: 'Webhook acknowledged' })
  async handleRazorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
    @Body()
    body?: {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            order_id?: string;
            notes?: { tenantId?: string; sessionId?: string };
          };
        };
        qr_code?: {
          entity?: {
            id?: string;
            notes?: { tenantId?: string; sessionId?: string };
          };
        };
      };
    },
  ): Promise<{ received: boolean; sessionId?: string }> {
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(body ?? {}));

    if (razorpayWebhookSecret()) {
      if (!signature) {
        throw new UnauthorizedException('Missing x-razorpay-signature header');
      }
      this.razorpayProvider.verifyWebhookSignature(payload, signature);
    }

    if (body?.event === 'payment.captured') {
      const payment = body.payload?.payment?.entity;
      const orderId = payment?.order_id;
      const tenantId = payment?.notes?.tenantId;
      if (orderId && tenantId) {
        const session = await this.runInTenantContext(tenantId, () =>
          this.paymentService.markSessionPaidByProviderRef(tenantId, orderId),
        );
        return { received: true, sessionId: session?.id };
      }
    }

    if (body?.event === 'qr_code.credited') {
      const qr = body.payload?.qr_code?.entity;
      const qrId = qr?.id;
      const tenantId = qr?.notes?.tenantId;
      if (qrId && tenantId) {
        const session = await this.runInTenantContext(tenantId, () =>
          this.paymentService.markSessionPaidByProviderRef(tenantId, qrId),
        );
        return { received: true, sessionId: session?.id };
      }
    }

    return { received: true };
  }

  private async markStripePaid(intent: {
    id: string;
    metadata?: { tenantId?: string; sessionId?: string };
  }): Promise<{ received: boolean; sessionId?: string }> {
    const tenantId = intent.metadata?.tenantId;
    if (!tenantId) {
      return { received: true };
    }

    const session = await this.runInTenantContext(tenantId, () =>
      this.paymentService.markSessionPaidByProviderRef(tenantId, intent.id),
    );
    return { received: true, sessionId: session?.id };
  }

  private async runInTenantContext<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (this.tenantResolver) {
      const ctx = await this.tenantResolver.resolve(tenantId, TenantEnvironment.PROD);
      return TenantContextStorage.run(ctx, fn);
    }

    const ctx: TenantContext = {
      tenantId,
      tenantSlug: 'sv-temple',
      environment: TenantEnvironment.PROD,
      environmentId: `memory-${TenantEnvironment.PROD}`,
      dbName: `tms_sv_temple_${TenantEnvironment.PROD}`,
    };
    return TenantContextStorage.run(ctx, fn);
  }
}
