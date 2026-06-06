import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CreatePaymentSessionInput,
  Currency,
  FxRates,
  PaymentProvider,
  PaymentProvidersResponse,
  PaymentSession,
  PaymentStatus,
} from '@tms/types';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';

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
  private readonly sessions = new Map<string, SessionRecord>();

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

  createSession(
    tenantId: string,
    input: CreatePaymentSessionInput,
  ): PaymentSession {
    const now = new Date();
    const session: SessionRecord = {
      id: uuidv4(),
      tenantId,
      amount: input.amount,
      currency: input.currency,
      provider: input.provider,
      status: PaymentStatus.PENDING,
      purpose: input.purpose,
      devoteeId: input.devoteeId,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);

    // Counter cash sessions skip PSP confirmation.
    if (input.provider === 'cash') {
      return this.confirmSession(tenantId, session.id);
    }

    return session;
  }

  confirmSession(tenantId: string, sessionId: string): PaymentSession {
    const session = this.getSession(tenantId, sessionId);

    if (session.status === PaymentStatus.PAID) {
      return session;
    }

    // Demo mode: no Stripe/Razorpay call — mark paid immediately (local/dev/UAT only).
    session.status = PaymentStatus.PAID;
    session.updatedAt = new Date();
    this.sessions.set(session.id, session);
    return session;
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
