import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  BookingStatus,
  DevoteeLookupMatch,
  DevoteeLookupResult,
  DevoteeProfile,
  DisplayBoard,
  DisplayBoardLane,
  IssueTokenInput,
  NowServing,
  PosCheckoutInput,
  PosCheckoutResult,
  QueueStats,
  QueueToken,
  QueueType,
  resolveSevaUnitPrice,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { QueueTokenEntity } from '../../database/entities/tenant/queue-token.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { BookingService } from '../booking/booking.service';
import { DevoteeService } from '../devotee/devotee.service';
import { DonationService } from '../donation/donation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentService } from '../payment/payment.service';
import { PlatformService } from '../platform/platform.service';
import { SevaCatalogService } from '../booking/seva-catalog.service';
import { PosCatalogService } from '../settings/pos-catalog.service';
import { TenantSiteSettingsService } from '../settings/tenant-site-settings.service';

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
  /** Memory mode only — postgres persists check-in on booking sankalpa. */
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
    private readonly donationService: DonationService,
    private readonly notificationsService: NotificationsService,
    private readonly platformService: PlatformService,
    private readonly paymentService: PaymentService,
    private readonly sevaCatalogService: SevaCatalogService,
    private readonly posCatalogService: PosCatalogService,
    private readonly siteSettings: TenantSiteSettingsService,
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
    if (this.usePostgres) {
      return new Set();
    }
    if (!this.checkedInBookings.has(tenantId)) {
      this.checkedInBookings.set(tenantId, new Set());
    }
    return this.checkedInBookings.get(tenantId)!;
  }

  private bookingCheckedIn(
    booking: { id: string; sankalpa?: unknown },
    tenantId: string,
  ): boolean {
    if (this.usePostgres) {
      return BookingService.isCheckedIn(
        booking.sankalpa as Parameters<typeof BookingService.isCheckedIn>[0],
      );
    }
    return this.checkedInSet(tenantId).has(booking.id);
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
        checkedIn: this.bookingCheckedIn(b, tenantId),
      })),
      ytdDonations: full.ytdDonations
        ? { amount: full.ytdDonations.amount, currency: full.ytdDonations.currency }
        : undefined,
    };
  }

  private toLookupMatch(d: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    gotram?: string;
    nakshatra?: string;
    membershipTier?: string;
    upcomingBooking?: string;
  }): DevoteeLookupMatch {
    return {
      id: d.id,
      name: `${d.firstName} ${d.lastName}`,
      phone: d.phone,
      gotram: d.gotram,
      nakshatra: d.nakshatra,
      membershipTier: d.membershipTier,
    };
  }

  private async buildLookupResult(
    tenantId: string,
    matches: DevoteeLookupMatch[],
    extras?: Map<string, { upcomingBooking?: string }>,
  ): Promise<DevoteeLookupResult> {
    if (matches.length === 0) {
      return { found: false, matches: [] };
    }
    const first = matches[0];
    const enriched = await this.enrichDevotee(tenantId, {
      ...first,
      upcomingBooking: extras?.get(first.id)?.upcomingBooking,
    });
    return { found: true, matches, devotee: enriched };
  }

  async lookupDevotee(
    tenantId: string,
    query: { phone?: string; name?: string },
  ): Promise<DevoteeLookupResult> {
    if (!query.phone?.trim() && !query.name?.trim()) {
      throw new BadRequestException('Provide phone or name for lookup');
    }

    if (this.usePostgres || query.phone || query.name) {
      const result = await this.devoteeService.findAll(tenantId, 1, 10, {
        phone: query.phone,
        name: query.name,
      });
      if (result.data.length > 0) {
        return this.buildLookupResult(
          tenantId,
          result.data.map((d) => this.toLookupMatch(d)),
        );
      }
      if (this.usePostgres) {
        return { found: false, matches: [] };
      }
    }

    this.ensureSeeded(tenantId);

    const legacyMatches: DevoteeLookupMatch[] = [];
    const extras = new Map<string, { upcomingBooking?: string }>();

    for (const devotee of this.devoteeDirectory.values()) {
      const normalizedQueryPhone = query.phone ? this.normalizePhone(query.phone) : '';
      const term = query.name?.toLowerCase() ?? '';
      const full = `${devotee.firstName} ${devotee.lastName}`.toLowerCase();
      const phoneHit =
        normalizedQueryPhone &&
        this.normalizePhone(devotee.phone) === normalizedQueryPhone;
      const nameHit = term && full.includes(term);
      if (phoneHit || nameHit) {
        legacyMatches.push(this.toLookupMatch(devotee));
        if (devotee.upcomingBooking) {
          extras.set(devotee.id, { upcomingBooking: devotee.upcomingBooking });
        }
      }
    }

    return this.buildLookupResult(tenantId, legacyMatches, extras);
  }

  async getDevoteeProfile(tenantId: string, devoteeId: string): Promise<DevoteeProfile> {
    const full = await this.devoteeService.findOne(tenantId, devoteeId);
    const family = full.familyId
      ? await this.devoteeService.findFamilyMembers(tenantId, full.familyId, devoteeId)
      : [];

    const today = this.todayIso();
    const now = new Date();

    const { data: allBookings } = await this.bookingService.findAll(tenantId, 1, 80, {
      devoteeId,
    });

    const todayBookings = allBookings
      .filter((b) => b.scheduledAt.toISOString().slice(0, 10) === today)
      .map((b) => ({
        id: b.id,
        serviceId: b.serviceId,
        scheduledAt: b.scheduledAt.toISOString(),
        status: b.status,
        checkedIn: this.bookingCheckedIn(b, tenantId),
      }));

    const toProfileBooking = (b: (typeof allBookings)[0]) => ({
      id: b.id,
      serviceId: b.serviceId,
      scheduledAt: b.scheduledAt.toISOString(),
      status: b.status,
      amount: b.amount,
      currency: b.currency,
      channel: b.channel,
      checkedIn: this.bookingCheckedIn(b, tenantId),
      receiptNumber: b.receiptNumber,
      paymentStatus: b.paymentStatus,
    });

    const upcomingBookings = allBookings
      .filter(
        (b) =>
          b.scheduledAt >= now &&
          b.status !== BookingStatus.CANCELLED &&
          b.status !== BookingStatus.COMPLETED,
      )
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .map(toProfileBooking);

    const bookingHistory = allBookings
      .filter((b) => b.scheduledAt < now || b.status === BookingStatus.COMPLETED)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
      .slice(0, 25)
      .map(toProfileBooking);

    const { data: donations } = await this.donationService.findDonations(tenantId, 1, 25, {
      devoteeId,
    });

    const hydrated = full;
    const addr = hydrated.address;

    return {
      id: hydrated.id,
      firstName: hydrated.firstName,
      lastName: hydrated.lastName,
      title: hydrated.title,
      email: hydrated.email,
      phone: hydrated.phone,
      country: hydrated.country,
      gotram: hydrated.gotram,
      nakshatra: hydrated.nakshatra,
      rashi: hydrated.rashi,
      gender: hydrated.gender,
      dateOfBirth: hydrated.dateOfBirth,
      familyId: hydrated.familyId,
      membershipTier: hydrated.membershipTier,
      membershipExpiresAt: hydrated.membershipExpiresAt?.toISOString(),
      status: hydrated.status,
      indiaState: hydrated.indiaState,
      preferredLanguage: hydrated.preferredLanguage,
      communicationOptIn: hydrated.communicationOptIn,
      phones: hydrated.phones,
      emails: hydrated.emails,
      addresses: hydrated.addresses,
      addressLine1: addr?.line1,
      city: addr?.city,
      state: addr?.state,
      postalCode: addr?.postalCode,
      ytdDonations: full.ytdDonations
        ? { amount: full.ytdDonations.amount, currency: full.ytdDonations.currency }
        : undefined,
      familyMembers: family.map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        phone: m.phone,
        gotram: m.gotram,
        relationship:
          m.lastName === full.lastName && m.firstName !== full.firstName
            ? 'Spouse'
            : 'Family member',
      })),
      todayBookings,
      upcomingBookings,
      bookingHistory,
      recentDonations: donations.map(
        (d: {
          id: string;
          amount: number;
          currency: string;
          purpose: string;
          createdAt: Date;
          receiptNumber?: string;
          paymentStatus?: string;
        }) => ({
          id: d.id,
          amount: d.amount,
          currency: d.currency,
          purpose: d.purpose,
          createdAt: d.createdAt.toISOString(),
          receiptNumber: d.receiptNumber,
          paymentStatus: d.paymentStatus,
        }),
      ),
    };
  }

  async checkInBooking(tenantId: string, bookingId: string): Promise<{ checkedIn: true }> {
    if (this.usePostgres) {
      await this.bookingService.markCheckedIn(tenantId, bookingId);
    } else {
      await this.bookingService.findOne(tenantId, bookingId);
      this.checkedInSet(tenantId).add(bookingId);
    }
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
    const site = await this.siteSettings.getBranding(tenantId);
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

  async posCheckout(tenantId: string, input: PosCheckoutInput): Promise<PosCheckoutResult> {
    const services = input.services ?? [];
    const donations = input.donations ?? [];
    const sales = input.sales ?? [];

    if (services.length === 0 && donations.length === 0 && sales.length === 0) {
      throw new BadRequestException('Add at least one service, donation, or sale line');
    }

    if (!(await this.devoteeService.exists(tenantId, input.devoteeId))) {
      throw new NotFoundException(`Devotee ${input.devoteeId} not found`);
    }

    const devotee = await this.devoteeService.findOne(tenantId, input.devoteeId);
    const sponsorName = `${devotee.firstName} ${devotee.lastName}`.trim();

    let grandTotal = 0;

    for (const line of services) {
      const service = await this.sevaCatalogService.findOne(tenantId, line.serviceId);
      const catalogCost = resolveSevaUnitPrice(service, line.location);
      const unitCost = line.unitCost ?? catalogCost;
      if (Math.abs(unitCost - catalogCost) > 0.01) {
        throw new BadRequestException(
          `Unit cost for ${service.name} (${unitCost}) does not match catalog ${line.location} price (${catalogCost})`,
        );
      }
      grandTotal += unitCost * line.quantity;
    }

    for (const line of donations) {
      grandTotal += line.amount;
    }

    for (const line of sales) {
      const item = await this.posCatalogService.findOne(tenantId, line.itemId);
      if (!item.isActive) {
        throw new BadRequestException(`Sales item ${line.itemId} is not available`);
      }
      grandTotal += item.price * line.quantity;
    }

    grandTotal = Math.round(grandTotal * 100) / 100;

    if (Math.abs(input.totalPaid - grandTotal) > 0.01) {
      throw new BadRequestException(
        `Total paid (${input.totalPaid}) does not match cart total (${grandTotal})`,
      );
    }

    await this.paymentService.assertPaidSession(
      tenantId,
      input.paymentSessionId,
      grandTotal,
      input.currency,
    );

    const notesParts: string[] = [];
    if (input.comment?.trim()) {
      notesParts.push(input.comment.trim());
    }
    if (input.paymentMethod === 'check' && input.checkNumber?.trim()) {
      notesParts.push(`Check #${input.checkNumber.trim()}`);
    } else if (input.paymentMethod) {
      notesParts.push(`Payment: ${input.paymentMethod}`);
    }
    const posNotes = notesParts.length > 0 ? notesParts.join(' · ') : undefined;

    const createdBookings = [];
    for (const line of services) {
      const service = await this.sevaCatalogService.findOne(tenantId, line.serviceId);
      const unitCost = resolveSevaUnitPrice(service, line.location);
      const lineAmount = Math.round(unitCost * line.quantity * 100) / 100;
      const scheduledAt = await this.resolveCounterScheduledAt(
        tenantId,
        line.serviceId,
        line.date,
      );

      const booking = await this.bookingService.createFromPosCheckout(tenantId, {
        devoteeId: input.devoteeId,
        serviceId: line.serviceId,
        scheduledAt: scheduledAt.toISOString(),
        channel: 'counter',
        quantity: line.quantity,
        location: line.location,
        lineAmount,
        sankalpa: {
          sponsorName,
          deity: line.deity?.trim() || service.deity,
          gotram: input.sankalpa?.gotram,
          nakshatra: input.sankalpa?.nakshatra,
          occasion: input.sankalpa?.occasion,
          location: line.location,
          quantity: line.quantity > 1 ? line.quantity : undefined,
          notes: posNotes,
        },
      });
      createdBookings.push(booking);
    }

    const createdDonations = [];
    for (const line of donations) {
      const purpose = line.purpose.startsWith('Counter')
        ? line.purpose
        : `Counter — ${line.purpose}`;
      const donation = await this.donationService.createFromPosCheckout(tenantId, {
        devoteeId: input.devoteeId,
        amount: line.amount,
        currency: input.currency,
        purpose: posNotes ? `${purpose} (${posNotes})` : purpose,
        paymentSessionId: input.paymentSessionId,
      });
      createdDonations.push(donation);
    }

    for (const line of sales) {
      const item = await this.posCatalogService.findOne(tenantId, line.itemId);
      const lineAmount = Math.round(item.price * line.quantity * 100) / 100;
      const purpose = `Counter — Article sale — ${item.name}${line.quantity > 1 ? ` ×${line.quantity}` : ''}`;
      const donation = await this.donationService.createFromPosCheckout(tenantId, {
        devoteeId: input.devoteeId,
        amount: lineAmount,
        currency: input.currency,
        purpose: posNotes ? `${purpose} (${posNotes})` : purpose,
        paymentSessionId: input.paymentSessionId,
      });
      createdDonations.push(donation);
    }

    const receiptNumber =
      createdBookings[0]?.receiptNumber ??
      createdDonations[0]?.receiptNumber ??
      `POS-${Date.now()}`;

    return {
      receiptNumber,
      bookings: createdBookings,
      donations: createdDonations,
      grandTotal,
      currency: input.currency,
    };
  }

  private async resolveCounterScheduledAt(
    tenantId: string,
    serviceId: string,
    date: string,
  ): Promise<Date> {
    const { slots } = await this.bookingService.getServiceSlots(tenantId, serviceId, date);
    const available = slots.find((s) => s.available);
    if (available) {
      return new Date(available.startTime);
    }
    return new Date(`${date.slice(0, 10)}T12:00:00.000Z`);
  }
}
