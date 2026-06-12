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
  TerminalCheckoutStatus,
  TerminalReader,
  UserRole,
} from '@tms/types';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { TenantResolverService } from '../../database/tenant-resolver.service';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import {
  CreateTerminalCheckoutDto,
  ProcessTerminalCheckoutDto,
} from './dto/terminal-checkout.dto';
import { PaymentService } from './payment.service';
import { razorpayWebhookSecret } from './payment-config';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';
import { StripeTerminalService } from './stripe-terminal.service';
import { TenantPaymentSettingsService } from '../settings/tenant-payment-settings.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeProvider: StripeProvider,
    private readonly stripeTerminalService: StripeTerminalService,
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

  @Get('terminal/config')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Terminal readiness for counter POS (no secrets)' })
  async getTerminalConfig(@TenantId() tenantId: string): Promise<{
    enabled: boolean;
    hasDefaultReader: boolean;
  }> {
    const terminal = await this.paymentSettings.resolveTerminalConfigForTenant(tenantId);
    return {
      enabled: terminal.enabled,
      hasDefaultReader: Boolean(terminal.defaultReaderId),
    };
  }

  @Get('terminal/readers')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'List Stripe Terminal readers for this temple location' })
  listTerminalReaders(@TenantId() tenantId: string): Promise<TerminalReader[]> {
    return this.stripeTerminalService.listReaders(tenantId);
  }

  @Post('terminal/sessions')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Create a card-present Terminal checkout session' })
  createTerminalSession(
    @TenantId() tenantId: string,
    @Body() dto: CreateTerminalCheckoutDto,
  ): Promise<PaymentSession> {
    return this.stripeTerminalService.createCheckout(tenantId, dto);
  }

  @Post('terminal/sessions/:id/process')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Send payment to Terminal reader (swipe / tap / insert)' })
  processTerminalSession(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ProcessTerminalCheckoutDto,
  ): Promise<TerminalCheckoutStatus> {
    return this.stripeTerminalService.processCheckout(tenantId, id, dto.readerId);
  }

  @Get('terminal/sessions/:id/status')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Poll Terminal checkout status' })
  getTerminalSessionStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<TerminalCheckoutStatus> {
    return this.stripeTerminalService.getCheckoutStatus(tenantId, id);
  }

  @Post('terminal/sessions/:id/cancel')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Cancel in-progress Terminal checkout' })
  cancelTerminalSession(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<TerminalCheckoutStatus> {
    return this.stripeTerminalService.cancelCheckout(tenantId, id);
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
        if (event.type === 'terminal.reader.action_failed') {
          const action = event.data.object as {
            failure_message?: string;
            process_payment_intent?: { payment_intent?: string };
          };
          const paymentIntentId = action.process_payment_intent?.payment_intent;
          if (paymentIntentId) {
            await this.runInTenantContext(tenantId, () =>
              this.stripeTerminalService.markTerminalFailed(
                tenantId,
                paymentIntentId,
                action.failure_message,
              ),
            );
          }
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
