import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  PaymentSession,
  PaymentStatus,
  TerminalCheckoutStatus,
  TerminalReader,
  TerminalSessionStatus,
} from '@tms/types';
import { TenantPaymentSettingsService } from '../settings/tenant-payment-settings.service';
import { PaymentService } from './payment.service';
import { StripeProvider } from './stripe.provider';

const TERMINAL_CHANNEL = 'counter_terminal';

@Injectable()
export class StripeTerminalService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeProvider: StripeProvider,
    private readonly paymentSettings: TenantPaymentSettingsService,
  ) {}

  async listReaders(tenantId: string): Promise<TerminalReader[]> {
    const terminal = await this.paymentSettings.resolveTerminalConfigForTenant(tenantId);
    if (!terminal.enabled || !terminal.locationId) {
      throw new BadRequestException(
        'Stripe Terminal is not configured. Add a Terminal location in Admin → Payments.',
      );
    }

    const readers = await this.stripeProvider.listTerminalReaders(
      tenantId,
      terminal.locationId,
    );
    return readers.map((reader) => ({
      id: reader.id,
      label: reader.label,
      deviceType: reader.deviceType,
      status: reader.status,
      serialNumber: reader.serialNumber,
      ipAddress: reader.ipAddress,
      locationId: reader.locationId,
    }));
  }

  async createCheckout(
    tenantId: string,
    input: {
      amount: number;
      currency: Currency;
      purpose: string;
      devoteeId?: string;
    },
  ): Promise<PaymentSession> {
    const terminal = await this.paymentSettings.resolveTerminalConfigForTenant(tenantId);
    if (!terminal.enabled || !terminal.locationId) {
      throw new BadRequestException(
        'Stripe Terminal is not enabled for this temple. Configure it in Admin → Payments.',
      );
    }

    const session = await this.paymentService.createTerminalSession(tenantId, {
      amount: input.amount,
      currency: input.currency,
      purpose: input.purpose,
      devoteeId: input.devoteeId,
      provider: 'stripe',
      metadata: { channel: TERMINAL_CHANNEL },
    });

    if (!session.providerRefId) {
      throw new BadRequestException(
        'Could not create a card-present payment. Check Stripe keys and Terminal activation.',
      );
    }

    return session;
  }

  async processCheckout(
    tenantId: string,
    sessionId: string,
    readerId?: string,
  ): Promise<TerminalCheckoutStatus> {
    const terminal = await this.paymentSettings.resolveTerminalConfigForTenant(tenantId);
    if (!terminal.enabled || !terminal.locationId) {
      throw new BadRequestException('Stripe Terminal is not configured for this temple.');
    }

    const session = await this.paymentService.getSession(tenantId, sessionId);
    if (session.metadata?.channel !== TERMINAL_CHANNEL || !session.providerRefId) {
      throw new BadRequestException('This payment session is not a Terminal checkout.');
    }
    if (session.status === PaymentStatus.PAID) {
      return this.toTerminalStatus(session);
    }

    const stripeConfig = await this.paymentSettings.resolveStripeConfigForTenant(tenantId);
    const isTestMode =
      stripeConfig.mode === 'test' || Boolean(stripeConfig.secretKey?.startsWith('sk_test_'));

    let resolvedReaderId = readerId?.trim() || terminal.defaultReaderId;
    if (!resolvedReaderId && isTestMode) {
      resolvedReaderId = await this.stripeProvider.ensureSimulatedReader(
        tenantId,
        terminal.locationId,
      );
    }
    if (!resolvedReaderId) {
      throw new BadRequestException(
        'No Terminal reader selected. Set a default reader in Admin → Payments or pass readerId.',
      );
    }

    await this.stripeProvider.processPaymentIntentOnReader(
      tenantId,
      resolvedReaderId,
      session.providerRefId,
    );

    await this.paymentService.updateTerminalSession(tenantId, sessionId, {
      terminalStatus: 'awaiting_card',
      terminalReaderId: resolvedReaderId,
    });

    if (isTestMode) {
      // Reader needs a moment to enter collect mode before test simulation.
      await new Promise((resolve) => setTimeout(resolve, 800));
      await this.stripeProvider.simulateTerminalPayment(tenantId, resolvedReaderId);
      await this.paymentService.syncTerminalSessionFromProvider(tenantId, sessionId);
    }

    const updated = await this.paymentService.getSession(tenantId, sessionId);
    return this.toTerminalStatus(updated);
  }

  async getCheckoutStatus(
    tenantId: string,
    sessionId: string,
  ): Promise<TerminalCheckoutStatus> {
    await this.paymentService.syncTerminalSessionFromProvider(tenantId, sessionId);
    const session = await this.paymentService.getSession(tenantId, sessionId);
    if (session.metadata?.channel !== TERMINAL_CHANNEL) {
      throw new NotFoundException('Terminal checkout session not found');
    }
    return this.toTerminalStatus(session);
  }

  async cancelCheckout(tenantId: string, sessionId: string): Promise<TerminalCheckoutStatus> {
    const session = await this.paymentService.getSession(tenantId, sessionId);
    if (session.metadata?.channel !== TERMINAL_CHANNEL) {
      throw new NotFoundException('Terminal checkout session not found');
    }

    if (session.terminalReaderId) {
      await this.stripeProvider.cancelReaderAction(tenantId, session.terminalReaderId);
    }

    await this.paymentService.updateTerminalSession(tenantId, sessionId, {
      terminalStatus: 'cancelled',
      status: PaymentStatus.FAILED,
    });

    const updated = await this.paymentService.getSession(tenantId, sessionId);
    return this.toTerminalStatus(updated);
  }

  async markTerminalFailed(
    tenantId: string,
    paymentIntentId: string,
    failureMessage?: string,
  ): Promise<void> {
    await this.paymentService.markTerminalFailedByProviderRef(
      tenantId,
      paymentIntentId,
      failureMessage,
    );
  }

  private toTerminalStatus(session: PaymentSession): TerminalCheckoutStatus {
    const status: TerminalSessionStatus =
      session.status === PaymentStatus.PAID
        ? 'succeeded'
        : (session.terminalStatus ?? 'pending');

    return {
      sessionId: session.id,
      status,
      readerId: session.terminalReaderId,
      failureMessage: session.terminalFailureMessage,
      amount: session.amount,
      currency: session.currency,
    };
  }
}
