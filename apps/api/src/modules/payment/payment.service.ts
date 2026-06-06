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
import { PaymentSessionEntity } from '../../database/entities/tenant/payment-session.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { isRazorpayLive, isStripeLive } from './payment-config';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';

const SESSION_TTL_MS = 30 * 60 * 1000;

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
  private readonly sessions = new Map<string, PaymentSession>();

  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly tenantData: TenantDataService,
  ) {}

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

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

  isLivePaymentRequired(currency: Currency): boolean {
    return this.resolvePaymentMode(this.getProviderForCurrency(currency)) === 'live';
  }

  async createSession(
    tenantId: string,
    input: CreatePaymentSessionInput,
  ): Promise<PaymentSession> {
    const now = new Date();
    const sessionId = uuidv4();
    const paymentMode = this.resolvePaymentMode(input.provider);
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    const session: PaymentSession = {
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
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    if (input.provider === 'stripe' && paymentMode === 'live') {
      const intent = await this.stripeProvider.createPaymentIntent({
        amount: input.amount,
        currency: input.currency,
        purpose: input.purpose,
        sessionId,
        tenantId,
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
        tenantId,
        devoteeId: input.devoteeId,
      });
      if (order) {
        session.providerRefId = order.orderId;
      }
    }

    await this.saveSession(tenantId, session);

    if (input.provider === 'cash') {
      return this.confirmSession(tenantId, session.id);
    }

    return session;
  }

  async confirmSession(tenantId: string, sessionId: string): Promise<PaymentSession> {
    const session = await this.getSessionRecord(tenantId, sessionId);

    if (session.status === PaymentStatus.PAID) {
      return session;
    }

    const mode = session.paymentMode ?? this.resolvePaymentMode(session.provider);

    if (
      mode === 'live' &&
      (session.provider === 'stripe' || session.provider === 'razorpay')
    ) {
      throw new BadRequestException(
        'Live stripe/razorpay sessions cannot be confirmed via this endpoint. ' +
          'Complete payment on the client, poll GET /payments/sessions/:id, or wait for webhook confirmation.',
      );
    }

    session.status = PaymentStatus.PAID;
    session.updatedAt = new Date();
    await this.saveSession(tenantId, session);
    return session;
  }

  async markSessionPaidByProviderRef(
    tenantId: string,
    providerRefId: string,
  ): Promise<PaymentSession | undefined> {
    const session = await this.findSessionByProviderRef(tenantId, providerRefId);
    if (!session || session.status === PaymentStatus.PAID) {
      return session;
    }

    session.status = PaymentStatus.PAID;
    session.updatedAt = new Date();
    await this.saveSession(tenantId, session);
    this.logger.log(
      `Marked session ${session.id} paid via webhook (ref=${providerRefId})`,
    );
    return session;
  }

  async markSessionPaidBySessionId(
    tenantId: string,
    sessionId: string,
  ): Promise<PaymentSession | undefined> {
    try {
      const session = await this.getSessionRecord(tenantId, sessionId);
      if (session.status === PaymentStatus.PAID) {
        return session;
      }
      session.status = PaymentStatus.PAID;
      session.updatedAt = new Date();
      await this.saveSession(tenantId, session);
      return session;
    } catch {
      return undefined;
    }
  }

  async enforcePaidCheckout(
    tenantId: string,
    paymentSessionId: string | undefined,
    expectedAmount: number,
    expectedCurrency: Currency,
  ): Promise<PaymentSession | undefined> {
    if (expectedAmount <= 0) {
      return undefined;
    }

    if (paymentSessionId) {
      return this.assertPaidSession(
        tenantId,
        paymentSessionId,
        expectedAmount,
        expectedCurrency,
      );
    }

    if (this.isLivePaymentRequired(expectedCurrency)) {
      throw new BadRequestException(
        'paymentSessionId is required when live payment providers are enabled',
      );
    }

    return undefined;
  }

  async assertPaidSession(
    tenantId: string,
    sessionId: string,
    expectedAmount: number,
    expectedCurrency: Currency,
  ): Promise<PaymentSession> {
    const session = await this.getSessionRecord(tenantId, sessionId);
    this.assertSessionUsable(session);

    if (session.status !== PaymentStatus.PAID) {
      const mode = session.paymentMode ?? this.resolvePaymentMode(session.provider);
      if (
        mode === 'live' &&
        (session.provider === 'stripe' || session.provider === 'razorpay')
      ) {
        throw new BadRequestException(
          `Payment session ${sessionId} is not paid (status: ${session.status}). ` +
            'Complete payment before booking or donating.',
        );
      }
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

  async getSession(tenantId: string, sessionId: string): Promise<PaymentSession> {
    let session = await this.getSessionRecord(tenantId, sessionId);
    const statusBefore = session.status;
    session = this.applyExpiry(session);
    if (session.status !== statusBefore) {
      await this.saveSession(tenantId, session);
    }
    if (session.status === PaymentStatus.PENDING) {
      const refreshed = await this.refreshSessionFromProvider(session);
      if (refreshed) {
        session = refreshed;
        await this.saveSession(tenantId, session);
      }
    }
    return session;
  }

  getProviderForCurrency(currency: Currency): PaymentProvider {
    return currency === Currency.INR ? 'razorpay' : 'stripe';
  }

  currentTenantId(): string {
    return TenantContextStorage.get().tenantId;
  }

  private async getSessionRecord(
    tenantId: string,
    sessionId: string,
  ): Promise<PaymentSession> {
    const cached = this.sessions.get(sessionId);
    if (cached?.tenantId === tenantId) {
      return this.applyExpiry(cached);
    }

    if (this.usePostgres) {
      const repo = await this.tenantData.paymentSessions();
      const row = await repo.findOne({ where: { id: sessionId } });
      if (!row) {
        throw new NotFoundException(`Payment session ${sessionId} not found`);
      }
      const session = this.toSession(tenantId, row);
      this.sessions.set(sessionId, session);
      return this.applyExpiry(session);
    }

    throw new NotFoundException(`Payment session ${sessionId} not found`);
  }

  private async findSessionByProviderRef(
    tenantId: string,
    providerRefId: string,
  ): Promise<PaymentSession | undefined> {
    for (const session of this.sessions.values()) {
      if (session.tenantId === tenantId && session.providerRefId === providerRefId) {
        return session;
      }
    }

    if (this.usePostgres) {
      const repo = await this.tenantData.paymentSessions();
      const row = await repo.findOne({ where: { providerRefId } });
      if (!row) {
        return undefined;
      }
      const session = this.toSession(tenantId, row);
      this.sessions.set(session.id, session);
      return session;
    }

    return undefined;
  }

  private async saveSession(tenantId: string, session: PaymentSession): Promise<void> {
    this.sessions.set(session.id, session);

    if (!this.usePostgres) {
      return;
    }

    const repo = await this.tenantData.paymentSessions();
    await repo.save({
      id: session.id,
      amount: session.amount,
      currency: session.currency,
      provider: session.provider,
      status: session.status,
      purpose: session.purpose,
      devoteeId: session.devoteeId,
      metadata: session.metadata,
      providerRefId: session.providerRefId,
      clientSecret: session.clientSecret,
      paymentMode: session.paymentMode,
      expiresAt: session.expiresAt ? new Date(session.expiresAt) : new Date(),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  }

  private toSession(tenantId: string, row: PaymentSessionEntity): PaymentSession {
    return {
      id: row.id,
      tenantId,
      amount: Number(row.amount),
      currency: row.currency as Currency,
      provider: row.provider as PaymentProvider,
      status: row.status as PaymentStatus,
      purpose: row.purpose,
      devoteeId: row.devoteeId,
      metadata: row.metadata,
      providerRefId: row.providerRefId,
      clientSecret: row.clientSecret,
      paymentMode: row.paymentMode as PaymentMode | undefined,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private applyExpiry(session: PaymentSession): PaymentSession {
    if (
      session.status === PaymentStatus.PENDING &&
      session.expiresAt &&
      new Date(session.expiresAt) < new Date()
    ) {
      session.status = PaymentStatus.FAILED;
      session.updatedAt = new Date();
      this.sessions.set(session.id, session);
    }
    return session;
  }

  private assertSessionUsable(session: PaymentSession): void {
    const expired =
      session.status === PaymentStatus.PENDING &&
      session.expiresAt &&
      new Date(session.expiresAt) < new Date();

    if (expired || session.status === PaymentStatus.FAILED) {
      throw new BadRequestException(`Payment session ${session.id} has expired`);
    }
  }

  private async refreshSessionFromProvider(
    session: PaymentSession,
  ): Promise<PaymentSession | undefined> {
    const mode = session.paymentMode ?? this.resolvePaymentMode(session.provider);
    if (mode !== 'live' || !session.providerRefId) {
      return undefined;
    }

    if (session.provider === 'stripe') {
      const status = await this.stripeProvider.retrievePaymentIntentStatus(
        session.providerRefId,
      );
      if (status === 'succeeded') {
        session.status = PaymentStatus.PAID;
        session.updatedAt = new Date();
        return session;
      }
    }

    if (session.provider === 'razorpay') {
      const status = await this.razorpayProvider.fetchOrderStatus(session.providerRefId);
      if (status === 'paid') {
        session.status = PaymentStatus.PAID;
        session.updatedAt = new Date();
        return session;
      }
    }

    return undefined;
  }
}
