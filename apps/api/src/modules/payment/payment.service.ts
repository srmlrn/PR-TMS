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
  TerminalSessionStatus,
  buildUpiQrPayload,
  buildWebPayQrPayload,
} from '@tms/types';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { PaymentSessionEntity } from '../../database/entities/tenant/payment-session.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { TenantPaymentSettingsService } from '../settings/tenant-payment-settings.service';
import { isRazorpayLive, demoUpiVpa, webPayOrigin } from './payment-config';
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
  [Currency.USD]: ['stripe', 'qr', 'demo', 'cash'],
  [Currency.INR]: ['razorpay', 'qr', 'demo', 'cash'],
  [Currency.CAD]: ['stripe', 'qr', 'demo', 'cash'],
  [Currency.GBP]: ['stripe', 'qr', 'demo', 'cash'],
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly sessions = new Map<string, PaymentSession>();

  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly tenantData: TenantDataService,
    private readonly paymentSettings: TenantPaymentSettingsService,
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

  async resolvePaymentMode(
    tenantId: string,
    provider: PaymentProvider,
  ): Promise<PaymentMode> {
    if (provider === 'demo' || provider === 'cash') {
      return 'demo';
    }
    if (provider === 'stripe') {
      const config = await this.paymentSettings.resolveStripeConfigForTenant(tenantId);
      return this.paymentSettings.isStripeLiveForTenant(config) ? 'live' : 'demo';
    }
    if (provider === 'razorpay') {
      return isRazorpayLive() ? 'live' : 'demo';
    }
    if (provider === 'qr') {
      return 'demo';
    }
    return 'demo';
  }

  async isLivePaymentRequired(tenantId: string, currency: Currency): Promise<boolean> {
    return (await this.resolvePaymentMode(tenantId, this.getProviderForCurrency(currency))) === 'live';
  }

  async createSession(
    tenantId: string,
    input: CreatePaymentSessionInput,
  ): Promise<PaymentSession> {
    const now = new Date();
    const sessionId = uuidv4();
    const paymentMode =
      input.provider === 'qr' && input.currency === Currency.INR && isRazorpayLive()
        ? 'live'
        : await this.resolvePaymentMode(tenantId, input.provider);
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
      const stripeConfig = await this.paymentSettings.resolveStripeConfigForTenant(tenantId);
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
        session.stripePublishableKey = stripeConfig.publishableKey?.trim();
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
    } else if (input.provider === 'qr') {
      await this.attachQrCheckout(session, tenantId, paymentMode, expiresAt);
    }

    await this.saveSession(tenantId, session);

    if (input.provider === 'cash') {
      return this.confirmSession(tenantId, session.id);
    }

    return session;
  }

  /** Card-present checkout for Stripe Terminal hardware at the counter. */
  async createTerminalSession(
    tenantId: string,
    input: CreatePaymentSessionInput,
  ): Promise<PaymentSession> {
    const now = new Date();
    const sessionId = uuidv4();
    const paymentMode = await this.resolvePaymentMode(tenantId, 'stripe');
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    const session: PaymentSession = {
      id: sessionId,
      tenantId,
      amount: input.amount,
      currency: input.currency,
      provider: 'stripe',
      status: PaymentStatus.PENDING,
      purpose: input.purpose,
      devoteeId: input.devoteeId,
      metadata: {
        ...input.metadata,
        channel: 'counter_terminal',
      },
      paymentMode,
      terminalStatus: 'pending',
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    if (paymentMode === 'live') {
      const stripeConfig = await this.paymentSettings.resolveStripeConfigForTenant(tenantId);
      const intent = await this.stripeProvider.createCardPresentPaymentIntent({
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
        session.stripePublishableKey = stripeConfig.publishableKey?.trim();
      }
    }

    await this.saveSession(tenantId, session);
    return session;
  }

  async updateTerminalSession(
    tenantId: string,
    sessionId: string,
    patch: {
      terminalStatus?: TerminalSessionStatus;
      terminalReaderId?: string;
      terminalFailureMessage?: string;
      status?: PaymentStatus;
    },
  ): Promise<PaymentSession> {
    const session = await this.getSessionRecord(tenantId, sessionId);
    if (patch.terminalStatus) session.terminalStatus = patch.terminalStatus;
    if (patch.terminalReaderId) session.terminalReaderId = patch.terminalReaderId;
    if (patch.terminalFailureMessage !== undefined) {
      session.terminalFailureMessage = patch.terminalFailureMessage;
    }
    if (patch.status) session.status = patch.status;
    session.updatedAt = new Date();
    await this.saveSession(tenantId, session);
    return session;
  }

  async syncTerminalSessionFromProvider(
    tenantId: string,
    sessionId: string,
  ): Promise<PaymentSession> {
    const session = await this.getSessionRecord(tenantId, sessionId);
    const refreshed = await this.refreshSessionFromProvider(session);
    if (refreshed) {
      if (refreshed.status === PaymentStatus.PAID) {
        refreshed.terminalStatus = 'succeeded';
      }
      await this.saveSession(tenantId, refreshed);
      return refreshed;
    }
    return session;
  }

  async markTerminalFailedByProviderRef(
    tenantId: string,
    providerRefId: string,
    failureMessage?: string,
  ): Promise<PaymentSession | undefined> {
    const session = await this.findSessionByProviderRef(tenantId, providerRefId);
    if (!session || session.status === PaymentStatus.PAID) {
      return session;
    }

    session.status = PaymentStatus.FAILED;
    session.terminalStatus = 'failed';
    session.terminalFailureMessage = failureMessage ?? 'Card declined on Terminal reader';
    session.updatedAt = new Date();
    await this.saveSession(tenantId, session);
    return session;
  }

  async confirmSession(tenantId: string, sessionId: string): Promise<PaymentSession> {
    const session = await this.getSessionRecord(tenantId, sessionId);

    if (session.status === PaymentStatus.PAID) {
      return session;
    }

    const mode = session.paymentMode ?? (await this.resolvePaymentMode(tenantId, session.provider));

    if (
      mode === 'live' &&
      (session.provider === 'stripe' ||
        session.provider === 'razorpay' ||
        session.provider === 'qr')
    ) {
      throw new BadRequestException(
        'Live payment sessions cannot be confirmed via this endpoint. ' +
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
    session.terminalStatus =
      session.metadata?.channel === 'counter_terminal' ? 'succeeded' : session.terminalStatus;
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

    if (await this.isLivePaymentRequired(tenantId, expectedCurrency)) {
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
      const mode = session.paymentMode ?? (await this.resolvePaymentMode(tenantId, session.provider));
      if (
        mode === 'live' &&
        (session.provider === 'stripe' ||
          session.provider === 'razorpay' ||
          session.provider === 'qr')
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

  /** Public mobile checkout (QR scan) — pending Stripe sessions only. */
  async getPublicCheckoutSession(
    tenantId: string,
    sessionId: string,
  ): Promise<PaymentSession> {
    const session = await this.getSession(tenantId, sessionId);
    if (session.status === PaymentStatus.PAID) {
      return session;
    }
    if (session.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment session is no longer available.');
    }
    if (session.provider !== 'stripe' || !session.clientSecret) {
      throw new BadRequestException(
        'This payment link is not available. Ask staff to generate a new QR code.',
      );
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
      metadata: {
        ...session.metadata,
        ...(session.stripePublishableKey
          ? { stripePublishableKey: session.stripePublishableKey }
          : {}),
        ...(session.qrPayload ? { qrPayload: session.qrPayload } : {}),
        ...(session.qrImageUrl ? { qrImageUrl: session.qrImageUrl } : {}),
        ...(session.terminalStatus ? { terminalStatus: session.terminalStatus } : {}),
        ...(session.terminalReaderId ? { terminalReaderId: session.terminalReaderId } : {}),
        ...(session.terminalFailureMessage
          ? { terminalFailureMessage: session.terminalFailureMessage }
          : {}),
      },
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
      stripePublishableKey: row.metadata?.stripePublishableKey,
      qrPayload: row.metadata?.qrPayload,
      qrImageUrl: row.metadata?.qrImageUrl,
      terminalStatus: row.metadata?.terminalStatus as TerminalSessionStatus | undefined,
      terminalReaderId: row.metadata?.terminalReaderId,
      terminalFailureMessage: row.metadata?.terminalFailureMessage,
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
    const mode =
      session.paymentMode ??
      (await this.resolvePaymentMode(session.tenantId, session.provider));
    if (mode !== 'live' || !session.providerRefId) {
      return undefined;
    }

    if (session.provider === 'stripe') {
      const status = await this.stripeProvider.retrievePaymentIntentStatus(
        session.tenantId,
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

    if (session.provider === 'qr' && session.providerRefId) {
      const status = await this.razorpayProvider.fetchQrCodeStatus(session.providerRefId);
      if (status === 'paid') {
        session.status = PaymentStatus.PAID;
        session.updatedAt = new Date();
        return session;
      }
    }

    return undefined;
  }

  private async attachQrCheckout(
    session: PaymentSession,
    tenantId: string,
    paymentMode: PaymentMode,
    expiresAt: Date,
  ): Promise<void> {
    const payeeName = session.metadata?.payeeName ?? 'Temple Management';

    if (paymentMode === 'live' && session.currency === Currency.INR) {
      const qr = await this.razorpayProvider.createUpiQrCode({
        amount: session.amount,
        currency: session.currency,
        purpose: session.purpose,
        sessionId: session.id,
        tenantId,
        devoteeId: session.devoteeId,
        closeBy: expiresAt,
      });
      if (qr) {
        session.providerRefId = qr.qrId;
        session.qrImageUrl = qr.imageUrl;
        session.qrPayload = qr.imageUrl;
        return;
      }
    }

    if (session.currency === Currency.INR) {
      session.qrPayload = buildUpiQrPayload({
        vpa: demoUpiVpa(),
        payeeName,
        amount: session.amount,
        purpose: session.purpose,
        transactionRef: session.id,
      });
      return;
    }

    session.qrPayload = buildWebPayQrPayload(webPayOrigin(), session.id, tenantId);
  }
}
