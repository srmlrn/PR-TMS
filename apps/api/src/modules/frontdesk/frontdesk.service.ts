import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DevoteeLookupResult,
  IssueTokenInput,
  QueueStats,
  QueueToken,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { QueueTokenEntity } from '../../database/entities/tenant/queue-token.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { DevoteeService } from '../devotee/devotee.service';

type QueueTokenRecord = QueueToken & TenantEntity;

interface SeededDevotee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  gotram?: string;
  nakshatra?: string;
  membershipTier?: string;
  upcomingBooking?: string;
}

@Injectable()
export class FrontDeskService
  extends BaseTenantService<QueueTokenRecord>
  implements OnModuleInit
{
  protected store = new Map<string, QueueTokenRecord>();
  private readonly devoteeDirectory = new Map<string, SeededDevotee>();
  private readonly tokenCounters = new Map<string, number>();
  private readonly servedTodayCounters = new Map<string, number>();

  private static readonly AVG_MINUTES_PER_TOKEN = 22;
  private static readonly BASE_QUEUE_SIZE = 53;

  constructor(
    private readonly tenantData: TenantDataService,
    private readonly devoteeService: DevoteeService,
  ) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedDevotees('00000000-0000-0000-0000-000000000001');
      this.seedQueueTokens('00000000-0000-0000-0000-000000000001');
    }
  }

  private seedDevotees(tenantId: string): void {
    const key = `${tenantId}:510-555-0191`;
    if (this.devoteeDirectory.has(key)) {
      return;
    }

    this.devoteeDirectory.set(key, {
      id: 'dev-rajan-krishnamurthy',
      firstName: 'Rajan',
      lastName: 'Krishnamurthy',
      phone: '510-555-0191',
      gotram: 'Bharadwaja',
      nakshatra: 'Rohini',
      membershipTier: 'Patron',
      upcomingBooking: 'Archana · 7 Jun 9:00 AM',
    });
  }

  private seedQueueTokens(tenantId: string): void {
    const waiting = this.scoped(tenantId).filter((t) => t.status === 'waiting');
    if (waiting.length > 0) {
      return;
    }

    for (let i = 1; i <= FrontDeskService.BASE_QUEUE_SIZE; i++) {
      this.createTokenRecord(tenantId, {
        tokenNumber: this.formatTokenNumber(i),
        position: i,
        queueSize: FrontDeskService.BASE_QUEUE_SIZE,
        estimatedWaitMinutes: this.estimateWait(i),
        status: 'waiting',
      });
    }

    this.tokenCounters.set(tenantId, FrontDeskService.BASE_QUEUE_SIZE);
    this.servedTodayCounters.set(tenantId, 312);
  }

  private ensureSeeded(tenantId: string): void {
    this.seedDevotees(tenantId);
    this.seedQueueTokens(tenantId);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private formatTokenNumber(sequence: number): string {
    return `A-${String(sequence).padStart(3, '0')}`;
  }

  private estimateWait(position: number): number {
    const tokensAhead = Math.max(0, position - 1);
    const batches = Math.ceil(tokensAhead / 3);
    return Math.max(1, batches * FrontDeskService.AVG_MINUTES_PER_TOKEN);
  }

  private createTokenRecord(
    tenantId: string,
    data: Omit<
      QueueTokenRecord,
      'id' | 'tenantId' | 'createdAt' | 'updatedAt'
    >,
  ): QueueTokenRecord {
    return this.createEntity(tenantId, data);
  }

  async lookupDevotee(tenantId: string, phone: string): Promise<DevoteeLookupResult> {
    if (this.usePostgres) {
      const result = await this.devoteeService.findAll(tenantId, 1, 1, { phone });
      if (result.data.length > 0) {
        const d = result.data[0];
        return {
          found: true,
          devotee: {
            id: d.id,
            name: `${d.firstName} ${d.lastName}`,
            phone: d.phone ?? phone,
            gotram: d.gotram,
            nakshatra: d.nakshatra,
            membershipTier: d.membershipTier,
          },
        };
      }
      return { found: false };
    }

    this.ensureSeeded(tenantId);
    const normalized = this.normalizePhone(phone);

    for (const devotee of this.devoteeDirectory.values()) {
      if (this.normalizePhone(devotee.phone) === normalized) {
        return {
          found: true,
          devotee: {
            id: devotee.id,
            name: `${devotee.firstName} ${devotee.lastName}`,
            phone: devotee.phone,
            gotram: devotee.gotram,
            nakshatra: devotee.nakshatra,
            membershipTier: devotee.membershipTier,
            upcomingBooking: devotee.upcomingBooking,
          },
        };
      }
    }

    return { found: false };
  }

  async issueToken(tenantId: string, input: IssueTokenInput): Promise<QueueTokenRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.queueTokens();
      const waiting = await repo.find({
        where: { status: 'waiting' },
        order: { position: 'ASC' },
      });

      const maxPosition = waiting.reduce((max, t) => Math.max(max, t.position), 0);
      const nextSequence = maxPosition + 1;
      const queueSize = waiting.length + 1;
      const position = queueSize;

      const saved = await repo.save(
        repo.create({
          token: this.formatTokenNumber(nextSequence),
          devoteeId: input.devoteeId,
          position,
          estimatedWaitMinutes: this.estimateWait(position),
          status: 'waiting',
        }),
      );

      for (const existing of waiting) {
        existing.estimatedWaitMinutes = this.estimateWait(existing.position);
        await repo.save(existing);
      }

      return this.toQueueToken(saved, queueSize, input.devoteeName);
    }

    this.ensureSeeded(tenantId);

    const waiting = this.scoped(tenantId).filter((t) => t.status === 'waiting');
    const nextSequence =
      (this.tokenCounters.get(tenantId) ?? FrontDeskService.BASE_QUEUE_SIZE) + 1;
    this.tokenCounters.set(tenantId, nextSequence);

    const queueSize = waiting.length + 1;
    const position = queueSize;

    const token = this.createTokenRecord(tenantId, {
      tokenNumber: this.formatTokenNumber(nextSequence),
      devoteeId: input.devoteeId,
      devoteeName: input.devoteeName,
      position,
      queueSize,
      estimatedWaitMinutes: this.estimateWait(position),
      status: 'waiting',
    });

    for (const existing of waiting) {
      existing.queueSize = queueSize;
      existing.estimatedWaitMinutes = this.estimateWait(existing.position);
      existing.updatedAt = new Date();
      this.store.set(existing.id, existing);
    }

    return token;
  }

  async getQueueStats(tenantId: string): Promise<QueueStats> {
    if (this.usePostgres) {
      const repo = await this.tenantData.queueTokens();
      const waiting = await repo.find({ where: { status: 'waiting' } });
      const servedToday = this.servedTodayCounters.get(tenantId) ?? 312;

      const averageWaitMinutes =
        waiting.length > 0
          ? Math.round(
              waiting.reduce((sum, t) => sum + t.estimatedWaitMinutes, 0) /
                waiting.length,
            )
          : 0;

      return {
        inQueue: waiting.length,
        averageWaitMinutes:
          averageWaitMinutes || FrontDeskService.AVG_MINUTES_PER_TOKEN,
        servedToday,
      };
    }

    this.ensureSeeded(tenantId);
    const waiting = this.scoped(tenantId).filter((t) => t.status === 'waiting');
    const servedToday = this.servedTodayCounters.get(tenantId) ?? 312;

    const averageWaitMinutes =
      waiting.length > 0
        ? Math.round(
            waiting.reduce((sum, t) => sum + t.estimatedWaitMinutes, 0) /
              waiting.length,
          )
        : 0;

    return {
      inQueue: waiting.length,
      averageWaitMinutes:
        averageWaitMinutes || FrontDeskService.AVG_MINUTES_PER_TOKEN,
      servedToday,
    };
  }

  private toQueueToken(
    row: QueueTokenEntity,
    queueSize: number,
    devoteeName?: string,
  ): QueueTokenRecord {
    const now = row.createdAt;
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      tokenNumber: row.token,
      devoteeId: row.devoteeId,
      devoteeName,
      position: row.position,
      queueSize,
      estimatedWaitMinutes: row.estimatedWaitMinutes,
      status: row.status as QueueToken['status'],
      createdAt: now,
      updatedAt: now,
    };
  }
}
