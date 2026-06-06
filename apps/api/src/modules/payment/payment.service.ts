import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CreatePaymentSessionInput,
  Currency,
  FxRates,
  PaymentMode,
  PaymentProvider,
  PaymentProvidersResponse,
  PaymentSession,
  PaymentStatus,
} from '@tms/types';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { isRazorpayLive, isStripeLive } from './payment-config';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';

type SessionRecord = PaymentSession;

const FX_RATES: Record<Currency, number> = {
  [Currency.USD]: 1,
  [Currency.INR]: 83.5,
  [Currency.CAD]: 1.36,
  [Currency.GBP]: 0.79,
};

/** Card PSP per currency; demo/cash are always available for local and counter flows. */
const PROVIDERS_BY_CURRENCY: Record<Currency, PaymentProvider[]> = {
  [Currency.USD]: ['stripe', 'demo', 'cash'],
  [Currency.INR]: ['razorpay', 'demo', 'cash'],
  [Currency.CAD]: ['stripe', 'demo', 'cash'],
  [Currency.GBP]: ['stripe', 'demo', 'cash'],
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly razorpayProvider: RazorpayProvider,
  ) {}

  getFxRates(): FxRates {
    return {
      base: Currency.USD,
      rates: FX_RATES,
      asOf: new Date().toISOString(),
    };
  }

  getProvidersByCurrency(): PaymentProvidersResponse {
    return Object.values(Currency).map((currency) => ({
      currency,
      providers: PROVIDERS_BY_CURRENCY[currency],
      defaultProvider: this.getProviderForCurrency(currency),
    }));
  }

  convertAmount(amount: number, from: Currency, to: Currency): number {
    const usd = amount / FX_RATES[from];
    return Math.round(usd * FX_RATES[to] * 100) / 100;
  }

  resolvePaymentMode(provider: PaymentProvider): PaymentMode {
    if (provider === 'demo' || provider === 'cash') {
      return 'demo';
    }
    if (provider === 'stripe') {
      return isStripeLive() ? 'live' : 'demo';
    }
    if (provider === 'razorpay') {
      return isRazorpayLive() ? 'live' : 'demo';
    }
    return 'demo';
  }

  async createSession(
    tenantId: string,
    input: CreatePaymentSessionInput,
  ): Promise<PaymentSession> {
    const now = new Date();
    const sessionId = uuidv4();
    const paymentMode = this.resolvePaymentMode(input.provider);

    const session: SessionRecord = {
      id: sessionId,
      tenantId,
      amount: input.amount,
      currency: input.currency,
      provider: input.provider,
      status: PaymentStatus.PENDING,
      purpose: input.purpose,
      devoteeId: input.devoteeId,
      metadata: input.metadata,
      paymentMode,
      createdAt: now,
      updatedAt: now,
    };

    if (input.provider === 'stripe' && paymentMode === 'live') {
      const intent = await this.stripeProvider.createPaymentIntent({
        amount: input.amount,
        currency: input.currency,
        purpose: input.purpose,
        sessionId,
        devoteeId: input.devoteeId,
      });
      if (intent) {
        session.providerRefId = intent.paymentIntentId;
        session.clientSecret = intent.clientSecret;
      }
    } else if (input.provider === 'razorpay' && paymentMode === 'live') {
      const order = await this.razorpayProvider.createOrder({
        amount: input.amount,
        currency: input.currency,
        purpose: input.purpose,
        sessionId,
        devoteeId: input.devoteeId,
      });
      if (order) {
        session.providerRefId = order.orderId;
      }
    }

    this.sessions.set(session.id, session);

    if (input.provider === 'cash') {
      return this.confirmSession(tenantId, session.id);
    }

    return session;
  }

  async confirmSession(tenantId: string, sessionId: string): Promise<PaymentSession> {
    const session = this.getSession(tenantId, sessionId);

    if (session.status === PaymentStatus.PAID) {
      return session;
    }

    const mode = session.paymentMode ?? this.resolvePaymentMode(session.provider);

    if (mode === 'live' && session.provider === 'stripe' && session.providerRefId) {
      const status = await this.stripeProvider.retrievePaymentIntentStatus(
        session.providerRefId,
      );
      if (status === 'succeeded') {
        session.status = PaymentStatus.PAID;
        session.updatedAt = new Date();
        this.sessions.set(session.id, session);
        return session;
      }
      throw new BadRequestException(
        `Stripe payment not completed (status: ${status ?? 'unknown'}). ` +
          'Complete payment on the client or wait for webhook confirmation.',
      );
    }

    if (mode === 'live' && session.provider === 'razorpay' && session.providerRefId) {
      const status = await this.razorpayProvider.fetchOrderStatus(session.providerRefId);
      if (status === 'paid') {
        session.status = PaymentStatus.PAID;
        session.updatedAt = new Date();
        this.sessions.set(session.id, session);
        return session;
      }
      throw new BadRequestException(
        `Razorpay order not paid (status: ${status ?? 'unknown'}). ` +
          'Complete payment on the client or wait for webhook confirmation.',
      );
    }

    session.status = PaymentStatus.PAID;
    session.updatedAt = new Date();
    this.sessions.set(session.id, session);
    return session;
  }

  markSessionPaidByProviderRef(providerRefId: string): PaymentSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.providerRefId === providerRefId && session.status !== PaymentStatus.PAID) {
        session.status = PaymentStatus.PAID;
        session.updatedAt = new Date();
        this.sessions.set(session.id, session);
        this.logger.log(`Marked session ${session.id} paid via webhook (ref=${providerRefId})`);
        return session;
      }
    }
    return undefined;
  }

  assertPaidSession(
    tenantId: string,
    sessionId: string,
    expectedAmount: number,
    expectedCurrency: Currency,
  ): PaymentSession {
    const session = this.getSession(tenantId, sessionId);

    if (session.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        `Payment session ${sessionId} is not paid (status: ${session.status})`,
      );
    }

    if (
      session.amount !== expectedAmount ||
      session.currency !== expectedCurrency
    ) {
      throw new BadRequestException('Payment session amount/currency mismatch');
    }

    return session;
  }

  getSession(tenantId: string, sessionId: string): PaymentSession {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundException(`Payment session ${sessionId} not found`);
    }
    return session;
  }

  getProviderForCurrency(currency: Currency): PaymentProvider {
    return currency === Currency.INR ? 'razorpay' : 'stripe';
  }

  currentTenantId(): string {
    return TenantContextStorage.get().tenantId;
  }
}
