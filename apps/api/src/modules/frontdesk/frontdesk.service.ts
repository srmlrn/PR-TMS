import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  DevoteeLookupResult,
  DisplayBoard,
  DisplayBoardLane,
  IssueTokenInput,
  NowServing,
  QueueStats,
  QueueToken,
  QueueType,
  getTenantBranding,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { QueueTokenEntity } from '../../database/entities/tenant/queue-token.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { BookingService } from '../booking/booking.service';
import { DevoteeService } from '../devotee/devotee.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlatformService } from '../platform/platform.service';

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
  private readonly checkedInBookings = new Map<string, Set<string>>();

  private static readonly AVG_MINUTES_PER_TOKEN = 22;
  private static readonly BASE_QUEUE_SIZE = 53;
  private static readonly LANE_ORDER: QueueType[] = ['priority', 'darshan', 'seva'];
  private static readonly COUNTER_LABELS: Record<QueueType, string> = {
    priority: 'VIP Counter',
    darshan: 'Counter 1 · Darshan',
    seva: 'Counter 2 · Seva',
  };
  constructor(
    private readonly tenantData: TenantDataService,
    private readonly devoteeService: DevoteeService,
    private readonly bookingService: BookingService,
    private readonly notificationsService: NotificationsService,
    private readonly platformService: PlatformService,
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
        queueType: 'darshan',
        priority: false,
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

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private checkedInSet(tenantId: string): Set<string> {
    if (!this.checkedInBookings.has(tenantId)) {
      this.checkedInBookings.set(tenantId, new Set());
    }
    return this.checkedInBookings.get(tenantId)!;
  }

  private createTokenRecord(
    tenantId: string,
    data: Omit<QueueTokenRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): QueueTokenRecord {
    return this.createEntity(tenantId, data);
  }

  private async enrichDevotee(
    tenantId: string,
    devotee: NonNullable<DevoteeLookupResult['devotee']>,
  ): Promise<NonNullable<DevoteeLookupResult['devotee']>> {
    const today = this.todayIso();
    const checkedIn = this.checkedInSet(tenantId);

    const { data: bookings } = await this.bookingService.findAll(tenantId, 1, 20, {
      devoteeId: devotee.id,
      date: today,
    });

    const full = await this.devoteeService.findOne(tenantId, devotee.id);

    return {
      ...devotee,
      todayBookings: bookings.map((b) => ({
        id: b.id,
        serviceId: b.serviceId,
        scheduledAt: b.scheduledAt.toISOString(),
        status: b.status,
        checkedIn: checkedIn.has(b.id),
      })),
      ytdDonations: full.ytdDonations
        ? { amount: full.ytdDonations.amount, currency: full.ytdDonations.currency }
        : undefined,
    };
  }

  async lookupDevotee(
    tenantId: string,
    query: { phone?: string; name?: string },
  ): Promise<DevoteeLookupResult> {
    if (!query.phone?.trim() && !query.name?.trim()) {
      throw new BadRequestException('Provide phone or name for lookup');
    }

    if (this.usePostgres || query.phone || query.name) {
      const result = await this.devoteeService.findAll(tenantId, 1, 5, {
        phone: query.phone,
        name: query.name,
      });
      if (result.data.length > 0) {
        const d = result.data[0];
        const base = {
          id: d.id,
          name: `${d.firstName} ${d.lastName}`,
          phone: d.phone ?? query.phone ?? '',
          gotram: d.gotram,
          nakshatra: d.nakshatra,
          membershipTier: d.membershipTier,
        };
        return {
          found: true,
          devotee: await this.enrichDevotee(tenantId, base),
        };
      }
      if (this.usePostgres) {
        return { found: false };
      }
    }

    this.ensureSeeded(tenantId);

    if (query.phone) {
      const normalized = this.normalizePhone(query.phone);
      for (const devotee of this.devoteeDirectory.values()) {
        if (this.normalizePhone(devotee.phone) === normalized) {
          const base = {
            id: devotee.id,
            name: `${devotee.firstName} ${devotee.lastName}`,
            phone: devotee.phone,
            gotram: devotee.gotram,
            nakshatra: devotee.nakshatra,
            membershipTier: devotee.membershipTier,
            upcomingBooking: devotee.upcomingBooking,
          };
          return { found: true, devotee: await this.enrichDevotee(tenantId, base) };
        }
      }
    }

    if (query.name) {
      const term = query.name.toLowerCase();
      for (const devotee of this.devoteeDirectory.values()) {
        const full = `${devotee.firstName} ${devotee.lastName}`.toLowerCase();
        if (full.includes(term)) {
          const base = {
            id: devotee.id,
            name: `${devotee.firstName} ${devotee.lastName}`,
            phone: devotee.phone,
            gotram: devotee.gotram,
            nakshatra: devotee.nakshatra,
            membershipTier: devotee.membershipTier,
            upcomingBooking: devotee.upcomingBooking,
          };
          return { found: true, devotee: await this.enrichDevotee(tenantId, base) };
        }
      }
    }

    return { found: false };
  }

  async checkInBooking(tenantId: string, bookingId: string): Promise<{ checkedIn: true }> {
    await this.bookingService.findOne(tenantId, bookingId);
    this.checkedInSet(tenantId).add(bookingId);
    return { checkedIn: true };
  }

  async listQueue(
    tenantId: string,
    filters?: { status?: QueueToken['status']; queueType?: QueueType },
  ): Promise<QueueTokenRecord[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.queueTokens();
      const qb = repo.createQueryBuilder('q').orderBy('q.priority', 'DESC').addOrderBy('q.position', 'ASC');

      if (filters?.status) {
        qb.andWhere('q.status = :status', { status: filters.status });
      }
      if (filters?.queueType) {
        qb.andWhere('q.queueType = :queueType', { queueType: filters.queueType });
      }

      const rows = await qb.getMany();
      const waiting = rows.filter((r) => r.status === 'waiting');
      const queueSize = waiting.length;
      return rows.map((r) => this.toQueueToken(r, queueSize, r.devoteeName));
    }

    this.ensureSeeded(tenantId);
    let items = this.scoped(tenantId);
    if (filters?.status) {
      items = items.filter((t) => t.status === filters.status);
    }
    if (filters?.queueType) {
      items = items.filter((t) => t.queueType === filters.queueType);
    }
    items.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return a.position - b.position;
    });
    const waiting = this.scoped(tenantId).filter((t) => t.status === 'waiting');
    return items.map((t) => ({ ...t, queueSize: waiting.length }));
  }

  async getNowServing(tenantId: string): Promise<NowServing[]> {
    const called = await this.listQueue(tenantId, { status: 'called' });
    return called.map((t) => ({
      tokenNumber: t.tokenNumber,
      devoteeName: t.devoteeName,
      queueType: t.queueType ?? 'darshan',
      status: t.status,
    }));
  }

  async getDisplayBoard(tenantId: string): Promise<DisplayBoard> {
    const site = getTenantBranding(tenantId);
    const stats = await this.getQueueStats(tenantId);

    const lanes: DisplayBoardLane[] = [];
    for (const queueType of FrontDeskService.LANE_ORDER) {
      const called = await this.listQueue(tenantId, { status: 'called', queueType });
      const waiting = await this.listQueue(tenantId, { status: 'waiting', queueType });

      lanes.push({
        queueType,
        counterLabel: FrontDeskService.COUNTER_LABELS[queueType],
        nowServing: called[0]
          ? {
              tokenNumber: called[0].tokenNumber,
              priority: called[0].priority,
            }
          : undefined,
        upNext: waiting.slice(0, 8).map((t) => ({
          tokenNumber: t.tokenNumber,
          priority: t.priority,
          position: t.position,
          estimatedWaitMinutes: t.estimatedWaitMinutes,
        })),
      });
    }

    return {
      tenantName: site.name,
      tenantIcon: site.icon,
      tenantLogoSrc: site.logoSrc,
      tenantLogoBg: site.logoBg,
      tenantLocation: site.location,
      hideNames: true,
      updatedAt: new Date().toISOString(),
      stats,
      lanes,
      announcements: site.displayAnnouncements ?? [],
    };
  }

  async callNext(tenantId: string, queueType?: QueueType): Promise<QueueTokenRecord | null> {
    const waiting = await this.listQueue(tenantId, {
      status: 'waiting',
      queueType,
    });
    if (waiting.length === 0) {
      return null;
    }
    return this.callToken(tenantId, waiting[0].id);
  }

  async callToken(tenantId: string, id: string): Promise<QueueTokenRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.queueTokens();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Token ${id} not found`);
      }
      row.status = 'called';
      const saved = await repo.save(row);
      const waiting = await repo.count({ where: { status: 'waiting' } });
      return this.toQueueToken(saved, waiting, saved.devoteeName);
    }

    const token = this.findOneScoped(tenantId, id);
    if (!token) {
      throw new NotFoundException(`Token ${id} not found`);
    }
    return this.updateEntity(tenantId, id, { status: 'called' });
  }

  async serveToken(tenantId: string, id: string): Promise<QueueTokenRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.queueTokens();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Token ${id} not found`);
      }
      row.status = 'served';
      const saved = await repo.save(row);
      this.servedTodayCounters.set(tenantId, (this.servedTodayCounters.get(tenantId) ?? 0) + 1);
      const waiting = await repo.count({ where: { status: 'waiting' } });
      return this.toQueueToken(saved, waiting, saved.devoteeName);
    }

    const token = this.findOneScoped(tenantId, id);
    if (!token) {
      throw new NotFoundException(`Token ${id} not found`);
    }
    this.servedTodayCounters.set(tenantId, (this.servedTodayCounters.get(tenantId) ?? 0) + 1);
    return this.updateEntity(tenantId, id, { status: 'served' });
  }

  async notifyToken(
    tenantId: string,
    id: string,
    phone: string,
  ): Promise<{ sent: boolean; message: string }> {
    const tokens = await this.listQueue(tenantId);
    const token = tokens.find((t) => t.id === id);
    if (!token) {
      throw new NotFoundException(`Token ${id} not found`);
    }

    const body = `Your darshan token is ${token.tokenNumber}. Position ${token.position} of ${token.queueSize}. Est. wait ~${token.estimatedWaitMinutes} min.`;
    const result = this.notificationsService.send({
      channel: 'sms',
      to: phone,
      body,
      metadata: { tokenId: id, tenantId },
    });

    return { sent: result.status === 'queued', message: body };
  }

  async issueToken(tenantId: string, input: IssueTokenInput): Promise<QueueTokenRecord> {
    const queueType: QueueType = input.priority ? 'priority' : (input.queueType ?? 'darshan');

    if (this.usePostgres) {
      const repo = await this.tenantData.queueTokens();
      const waiting = await repo.find({
        where: { status: 'waiting' },
        order: { position: 'ASC' },
      });

      const nextSequence = waiting.reduce((max, t) => {
        const num = parseInt(t.token.split('-')[1] ?? '0', 10);
        return Math.max(max, num);
      }, 0) + 1;

      let position = waiting.length + 1;
      if (input.priority) {
        position = 1;
        for (const existing of waiting) {
          existing.position += 1;
          existing.estimatedWaitMinutes = this.estimateWait(existing.position);
          await repo.save(existing);
        }
      }

      const queueSize = waiting.length + 1;
      const saved = await repo.save(
        repo.create({
          token: this.formatTokenNumber(nextSequence),
          devoteeId: input.devoteeId,
          devoteeName: input.devoteeName,
          position,
          estimatedWaitMinutes: this.estimateWait(position),
          status: 'waiting',
          queueType,
          priority: !!input.priority,
        }),
      );

      return this.toQueueToken(saved, queueSize, input.devoteeName);
    }

    this.ensureSeeded(tenantId);

    const waiting = this.scoped(tenantId).filter((t) => t.status === 'waiting');
    const nextSequence =
      (this.tokenCounters.get(tenantId) ?? FrontDeskService.BASE_QUEUE_SIZE) + 1;
    this.tokenCounters.set(tenantId, nextSequence);

    let position = waiting.length + 1;
    if (input.priority) {
      position = 1;
      for (const existing of waiting) {
        existing.position += 1;
        existing.estimatedWaitMinutes = this.estimateWait(existing.position);
        existing.updatedAt = new Date();
        this.store.set(existing.id, existing);
      }
    }

    const queueSize = waiting.length + 1;

    return this.createTokenRecord(tenantId, {
      tokenNumber: this.formatTokenNumber(nextSequence),
      devoteeId: input.devoteeId,
      devoteeName: input.devoteeName,
      position,
      queueSize,
      estimatedWaitMinutes: this.estimateWait(position),
      status: 'waiting',
      queueType,
      priority: !!input.priority,
    });
  }

  async getQueueStats(tenantId: string): Promise<QueueStats> {
    if (this.usePostgres) {
      const repo = await this.tenantData.queueTokens();
      const waiting = await repo.find({ where: { status: 'waiting' } });
      const called = await repo.count({ where: { status: 'called' } });
      const servedToday = this.servedTodayCounters.get(tenantId) ?? 312;

      const averageWaitMinutes =
        waiting.length > 0
          ? Math.round(
              waiting.reduce((sum, t) => sum + t.estimatedWaitMinutes, 0) / waiting.length,
            )
          : 0;

      return {
        inQueue: waiting.length,
        averageWaitMinutes:
          averageWaitMinutes || FrontDeskService.AVG_MINUTES_PER_TOKEN,
        servedToday,
        calledNow: called,
      };
    }

    this.ensureSeeded(tenantId);
    const waiting = this.scoped(tenantId).filter((t) => t.status === 'waiting');
    const called = this.scoped(tenantId).filter((t) => t.status === 'called');
    const servedToday = this.servedTodayCounters.get(tenantId) ?? 312;

    const averageWaitMinutes =
      waiting.length > 0
        ? Math.round(
            waiting.reduce((sum, t) => sum + t.estimatedWaitMinutes, 0) / waiting.length,
          )
        : 0;

    return {
      inQueue: waiting.length,
      averageWaitMinutes:
        averageWaitMinutes || FrontDeskService.AVG_MINUTES_PER_TOKEN,
      servedToday,
      calledNow: called.length,
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
      devoteeName: row.devoteeName ?? devoteeName,
      position: row.position,
      queueSize,
      estimatedWaitMinutes: row.estimatedWaitMinutes,
      status: row.status as QueueToken['status'],
      queueType: row.queueType as QueueType,
      priority: row.priority,
      createdAt: now,
      updatedAt: now,
    };
  }
}
