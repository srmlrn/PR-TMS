import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateDonationInput,
  Currency,
  Donation,
  DonationFrequency,
  DonationSubscription,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { DonationSubscriptionEntity } from '../../database/entities/tenant/donation-subscription.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { PaymentService } from '../payment/payment.service';

type SubscriptionRecord = DonationSubscription & TenantEntity;

const RECURRING_FREQUENCIES = new Set<DonationFrequency>([
  DonationFrequency.MONTHLY,
  DonationFrequency.ANNUAL,
]);

@Injectable()
export class DonationBillingService
  extends BaseTenantService<SubscriptionRecord>
  implements OnModuleInit
{
  protected store = new Map<string, SubscriptionRecord>();
  private readonly logger = new Logger(DonationBillingService.name);

  constructor(
    private readonly tenantData: TenantDataService,
    private readonly paymentService: PaymentService,
  ) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    this.logger.log('Donation billing scheduler stub started (daily check on init)');
    void this.runBillingCheck(new Date());
  }

  async createFromDonation(
    tenantId: string,
    donation: Donation,
    input: CreateDonationInput,
  ): Promise<SubscriptionRecord | undefined> {
    const frequency = input.frequency ?? DonationFrequency.ONE_TIME;
    if (!RECURRING_FREQUENCIES.has(frequency)) {
      return undefined;
    }

    const nextBillingAt = this.computeNextBillingAt(new Date(), frequency);

    if (this.usePostgres) {
      const repo = await this.tenantData.donationSubscriptions();
      const entity = repo.create({
        devoteeId: donation.devoteeId,
        donationId: donation.id,
        amount: donation.amount,
        currency: donation.currency,
        purpose: donation.purpose,
        frequency,
        status: 'active',
        nextBillingAt,
      });
      const saved = await repo.save(entity);
      return this.toSubscription(saved);
    }

    return this.createEntity(tenantId, {
      devoteeId: donation.devoteeId,
      donationId: donation.id,
      amount: donation.amount,
      currency: donation.currency,
      purpose: donation.purpose,
      frequency,
      status: 'active',
      nextBillingAt,
    });
  }

  async runBillingCheck(asOf: Date): Promise<void> {
    const due = await this.findDueSubscriptions(asOf);
    for (const sub of due) {
      const provider =
        sub.currency === Currency.INR ? 'razorpay' : ('stripe' as const);

      const session = await this.paymentService.createSession(sub.tenantId, {
        amount: sub.amount,
        currency: sub.currency,
        provider,
        purpose: `Recurring donation: ${sub.purpose}`,
        devoteeId: sub.devoteeId,
        metadata: {
          subscriptionId: sub.id,
          donationId: sub.donationId,
        },
      });

      await this.paymentService.confirmSession(sub.tenantId, session.id);

      this.logger.log(
        `[billing] charged subscription=${sub.id} devotee=${sub.devoteeId} ` +
          `amount=${sub.currency} ${sub.amount} session=${session.id} ` +
          `mode=${session.paymentMode ?? 'demo'}`,
      );

      await this.advanceNextBilling(sub, session.id);
    }
    if (due.length === 0) {
      this.logger.debug(`[billing-stub] no subscriptions due on ${asOf.toISOString().slice(0, 10)}`);
    }
  }

  private async advanceNextBilling(
    sub: SubscriptionRecord,
    paymentSessionId: string,
  ): Promise<void> {
    const nextBillingAt = this.computeNextBillingAt(sub.nextBillingAt, sub.frequency);

    if (this.usePostgres) {
      const repo = await this.tenantData.donationSubscriptions();
      await repo.update(sub.id, {
        nextBillingAt,
        lastPaymentSessionId: paymentSessionId,
      });
      return;
    }

    this.updateEntity(sub.tenantId, sub.id, {
      nextBillingAt,
      lastPaymentSessionId: paymentSessionId,
    });
  }

  private async findDueSubscriptions(asOf: Date): Promise<SubscriptionRecord[]> {
    const dayStart = new Date(asOf);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(asOf);
    dayEnd.setHours(23, 59, 59, 999);

    if (this.usePostgres) {
      const repo = await this.tenantData.donationSubscriptions();
      const rows = await repo
        .createQueryBuilder('s')
        .where('s.status = :status', { status: 'active' })
        .andWhere('s.nextBillingAt >= :dayStart', { dayStart })
        .andWhere('s.nextBillingAt <= :dayEnd', { dayEnd })
        .getMany();
      return rows.map((r) => this.toSubscription(r));
    }

    return [...this.store.values()].filter(
      (s) =>
        s.status === 'active' &&
        s.nextBillingAt >= dayStart &&
        s.nextBillingAt <= dayEnd,
    );
  }

  private computeNextBillingAt(from: Date, frequency: DonationFrequency): Date {
    const next = new Date(from);
    if (frequency === DonationFrequency.MONTHLY) {
      next.setMonth(next.getMonth() + 1);
    } else if (frequency === DonationFrequency.ANNUAL) {
      next.setFullYear(next.getFullYear() + 1);
    }
    return next;
  }

  private toSubscription(row: DonationSubscriptionEntity): SubscriptionRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      devoteeId: row.devoteeId,
      donationId: row.donationId,
      amount: Number(row.amount),
      currency: row.currency as Currency,
      purpose: row.purpose,
      frequency: row.frequency as DonationFrequency,
      status: row.status as SubscriptionRecord['status'],
      nextBillingAt: row.nextBillingAt,
      lastPaymentSessionId: row.lastPaymentSessionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
