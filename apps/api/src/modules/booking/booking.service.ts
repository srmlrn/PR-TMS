import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import {
  Booking,
  BookingStatus,
  CreateBookingInput,
  Currency,
  GANESHA_TEMPLE_ID,
  PaginatedResponse,
  PaymentStatus,
  TaxReceipt,
} from '@tms/types';
import { PaymentService } from '../payment/payment.service';
import { TenantSiteSettingsService } from '../settings/tenant-site-settings.service';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { BookingEntity } from '../../database/entities/tenant/booking.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import {
  formatReceiptNumber,
  nextReceiptSequence,
} from '../../common/utils/receipt-sequence.util';
import { DevoteeService } from '../devotee/devotee.service';
import { SevaCatalogService, TimeSlot } from './seva-catalog.service';

type BookingRecord = Booking & TenantEntity;

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';
const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

@Injectable()
export class BookingService
  extends BaseTenantService<BookingRecord>
  implements OnModuleInit
{
  protected store = new Map<string, BookingRecord>();
  private readonly receiptCounters = new Map<string, number>();

  constructor(
    private readonly sevaCatalogService: SevaCatalogService,
    private readonly devoteeService: DevoteeService,
    private readonly tenantData: TenantDataService,
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => TenantSiteSettingsService))
    private readonly siteSettings: TenantSiteSettingsService,
  ) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedDemoBookings();
    }
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: { date?: string; devoteeId?: string },
  ): Promise<PaginatedResponse<BookingRecord>> {
    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const qb = repo.createQueryBuilder('b');

      if (filters?.devoteeId) {
        qb.andWhere('b.devoteeId = :devoteeId', { devoteeId: filters.devoteeId });
      }
      if (filters?.date) {
        qb.andWhere('DATE(b.scheduledAt) = :date', { date: filters.date.slice(0, 10) });
      }

      qb.orderBy('b.scheduledAt', 'ASC');
      const total = await qb.getCount();
      const rows = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      return {
        data: rows.map((r) => this.toBooking(r)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    let items = this.scoped(tenantId);

    if (filters?.devoteeId) {
      items = items.filter((b) => b.devoteeId === filters.devoteeId);
    }

    if (filters?.date) {
      items = items.filter((b) => this.isSameDate(b.scheduledAt, filters.date!));
    }

    items.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    return this.paginate(items, page, limit);
  }

  async create(tenantId: string, input: CreateBookingInput): Promise<BookingRecord> {
    if (!(await this.devoteeService.exists(tenantId, input.devoteeId))) {
      throw new NotFoundException(`Devotee ${input.devoteeId} not found`);
    }

    const service = await this.sevaCatalogService.findOne(tenantId, input.serviceId);
    const scheduledAt = new Date(input.scheduledAt);
    const quantity = input.quantity ?? 1;
    const lineAmount = service.price * quantity;

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt must be a valid ISO date-time');
    }

    await this.assertNoConflict(tenantId, input.serviceId, scheduledAt, service.durationMinutes);

    let paymentStatus = PaymentStatus.PAID;
    const paidSession = await this.paymentService.enforcePaidCheckout(
      tenantId,
      input.paymentSessionId,
      lineAmount,
      service.currency,
    );
    if (paidSession) {
      paymentStatus = paidSession.status;
    }

    const sankalpa = this.buildSankalpa(input, quantity);

    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const entity = repo.create({
        devoteeId: input.devoteeId,
        serviceId: input.serviceId,
        scheduledAt,
        status: BookingStatus.CONFIRMED,
        amount: lineAmount,
        currency: service.currency,
        sankalpa: sankalpa as Record<string, string | number> | undefined,
        receiptNumber: await this.generateReceiptNumber(tenantId),
        channel: input.channel ?? 'app',
        paymentStatus,
      });
      const saved = await repo.save(entity);
      return this.toBooking(saved);
    }

    return this.createEntity(tenantId, {
      devoteeId: input.devoteeId,
      serviceId: input.serviceId,
      scheduledAt,
      status: BookingStatus.CONFIRMED,
      amount: lineAmount,
      currency: service.currency,
      sankalpa,
      receiptNumber: this.generateReceiptNumberSync(tenantId),
      channel: input.channel ?? 'app',
      paymentStatus,
    });
  }

  /** POS checkout — payment verified once at session level; skip per-line amount check. */
  async createFromPosCheckout(
    tenantId: string,
    input: CreateBookingInput & {
      lineAmount: number;
      receiptNumber?: string;
      checkoutReceiptId?: string;
    },
  ): Promise<BookingRecord> {
    if (!(await this.devoteeService.exists(tenantId, input.devoteeId))) {
      throw new NotFoundException(`Devotee ${input.devoteeId} not found`);
    }

    const service = await this.sevaCatalogService.findOne(tenantId, input.serviceId);
    const scheduledAt = new Date(input.scheduledAt);
    const quantity = input.quantity ?? 1;

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt must be a valid ISO date-time');
    }

    await this.assertNoConflict(tenantId, input.serviceId, scheduledAt, service.durationMinutes);

    const sankalpa = this.buildSankalpa(input, quantity);
    const receiptNumber =
      input.receiptNumber ?? (await this.generateReceiptNumber(tenantId));

    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const entity = repo.create({
        devoteeId: input.devoteeId,
        serviceId: input.serviceId,
        scheduledAt,
        status: BookingStatus.CONFIRMED,
        amount: input.lineAmount,
        currency: service.currency,
        sankalpa: sankalpa as Record<string, string | number> | undefined,
        receiptNumber,
        checkoutReceiptId: input.checkoutReceiptId,
        channel: input.channel ?? 'counter',
        paymentStatus: PaymentStatus.PAID,
      });
      const saved = await repo.save(entity);
      return this.toBooking(saved);
    }

    return this.createEntity(tenantId, {
      devoteeId: input.devoteeId,
      serviceId: input.serviceId,
      scheduledAt,
      status: BookingStatus.CONFIRMED,
      amount: input.lineAmount,
      currency: service.currency,
      sankalpa,
      receiptNumber: input.receiptNumber ?? this.generateReceiptNumberSync(tenantId),
      checkoutReceiptId: input.checkoutReceiptId,
      channel: input.channel ?? 'counter',
      paymentStatus: PaymentStatus.PAID,
    });
  }

  async update(
    tenantId: string,
    id: string,
    patch: { priestId?: string },
  ): Promise<BookingRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Booking ${id} not found`);
      }
      if (patch.priestId !== undefined) {
        row.priestId = patch.priestId;
      }
      const saved = await repo.save(row);
      return this.toBooking(saved);
    }

    const existing = this.findOneScoped(tenantId, id);
    if (!existing) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    const updates: Partial<BookingRecord> = {};
    if (patch.priestId !== undefined) {
      updates.priestId = patch.priestId;
    }
    return this.updateEntity(tenantId, id, updates);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: BookingStatus,
  ): Promise<BookingRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Booking ${id} not found`);
      }
      row.status = status;
      if (status === BookingStatus.COMPLETED) {
        row.honorariumAmount = Number(row.amount);
      }
      const saved = await repo.save(row);
      return this.toBooking(saved);
    }

    const existing = this.findOneScoped(tenantId, id);
    if (!existing) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    const patch: Partial<BookingRecord> = { status };
    if (status === BookingStatus.COMPLETED) {
      patch.honorariumAmount = existing.amount;
    }
    return this.updateEntity(tenantId, id, patch);
  }

  /** Front desk check-in — persisted on booking sankalpa JSON. */
  async markCheckedIn(tenantId: string, bookingId: string): Promise<BookingRecord> {
    const booking = await this.findOne(tenantId, bookingId);
    const sankalpa: Record<string, string | number> = {
      ...(booking.sankalpa as Record<string, string | number> | undefined),
      checkedIn: 1,
      checkedInAt: new Date().toISOString(),
    };

    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const row = await repo.findOne({ where: { id: bookingId } });
      if (!row) {
        throw new NotFoundException(`Booking ${bookingId} not found`);
      }
      row.sankalpa = sankalpa;
      const saved = await repo.save(row);
      return this.toBooking(saved);
    }

    return this.updateEntity(tenantId, bookingId, {
      sankalpa: sankalpa as unknown as Booking['sankalpa'],
    });
  }

  static isCheckedIn(sankalpa?: Booking['sankalpa'] | Record<string, string | number>): boolean {
    if (!sankalpa) return false;
    const v = (sankalpa as Record<string, string | number>).checkedIn;
    return v === 1 || v === '1';
  }

  async findOne(tenantId: string, id: string): Promise<BookingRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Booking ${id} not found`);
      }
      return this.toBooking(row);
    }

    const booking = this.findOneScoped(tenantId, id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return booking;
  }

  async getReceipt(tenantId: string, id: string): Promise<TaxReceipt> {
    const booking = await this.findOne(tenantId, id);
    const branding = await this.siteSettings.getBranding(tenantId);
    return {
      receiptNumber: booking.receiptNumber ?? `BKG-${booking.id.slice(0, 8)}`,
      amount: booking.amount,
      currency: booking.currency,
      devoteeId: booking.devoteeId,
      purpose: `Seva booking — ${booking.serviceId}`,
      issuedAt: booking.createdAt.toISOString(),
      templeName: branding.name,
    };
  }

  async getHonorariumTotal(tenantId: string, date: string): Promise<number> {
    const { data } = await this.findAll(tenantId, 1, 100, { date });
    return data
      .filter((b) => b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + (b.honorariumAmount ?? b.amount), 0);
  }

  async getServiceSlots(
    tenantId: string,
    serviceId: string,
    date: string,
  ): Promise<{ serviceId: string; date: string; slots: TimeSlot[] }> {
    const bookedRanges = await this.getBookedRangesForService(tenantId, serviceId, date);
    const slotWindow = await this.siteSettings.getSlotWindow(tenantId);
    const slots = await this.sevaCatalogService.getSlotsForDate(
      tenantId,
      serviceId,
      date,
      bookedRanges,
      slotWindow,
    );

    return { serviceId, date, slots };
  }

  private async assertNoConflict(
    tenantId: string,
    serviceId: string,
    scheduledAt: Date,
    durationMinutes: number,
  ): Promise<void> {
    const end = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const bookings = await repo
        .createQueryBuilder('b')
        .where('b.serviceId = :serviceId', { serviceId })
        .andWhere('b.status IN (:...statuses)', {
          statuses: ACTIVE_STATUSES,
        })
        .getMany();

      const conflict = bookings.find((booking) => {
        const bookingEnd = new Date(
          booking.scheduledAt.getTime() + durationMinutes * 60_000,
        );
        return (
          scheduledAt.getTime() < bookingEnd.getTime() &&
          booking.scheduledAt.getTime() < end.getTime()
        );
      });

      if (conflict) {
        throw new ConflictException(
          `Time slot conflicts with existing booking at ${conflict.scheduledAt.toISOString()}`,
        );
      }
      return;
    }

    const conflicts = this.scoped(tenantId).filter((booking) => {
      if (booking.serviceId !== serviceId) {
        return false;
      }
      if (!ACTIVE_STATUSES.includes(booking.status)) {
        return false;
      }

      const bookingEnd = new Date(
        booking.scheduledAt.getTime() + durationMinutes * 60_000,
      );

      return (
        scheduledAt.getTime() < bookingEnd.getTime() &&
        booking.scheduledAt.getTime() < end.getTime()
      );
    });

    if (conflicts.length > 0) {
      throw new ConflictException(
        `Time slot conflicts with existing booking at ${conflicts[0].scheduledAt.toISOString()}`,
      );
    }
  }

  private async getBookedRangesForService(
    tenantId: string,
    serviceId: string,
    date: string,
  ): Promise<Array<{ start: Date; end: Date }>> {
    const service = await this.sevaCatalogService.findOne(tenantId, serviceId);

    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const bookings = await repo
        .createQueryBuilder('b')
        .where('b.serviceId = :serviceId', { serviceId })
        .andWhere('b.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
        .andWhere('DATE(b.scheduledAt) = :date', { date: date.slice(0, 10) })
        .getMany();

      return bookings.map((booking) => ({
        start: booking.scheduledAt,
        end: new Date(
          booking.scheduledAt.getTime() + service.durationMinutes * 60_000,
        ),
      }));
    }

    return this.scoped(tenantId)
      .filter(
        (booking) =>
          booking.serviceId === serviceId &&
          ACTIVE_STATUSES.includes(booking.status) &&
          this.isSameDate(booking.scheduledAt, date),
      )
      .map((booking) => ({
        start: booking.scheduledAt,
        end: new Date(
          booking.scheduledAt.getTime() + service.durationMinutes * 60_000,
        ),
      }));
  }

  private buildSankalpa(
    input: CreateBookingInput,
    quantity = 1,
  ): Booking['sankalpa'] | undefined {
    const {
      sankalpa,
      priestPreference,
      location,
      remoteParticipation,
      additionalBeneficiaries,
    } = input;
    const remote =
      remoteParticipation ?? sankalpa?.remoteParticipation;
    const beneficiaries =
      additionalBeneficiaries ?? sankalpa?.additionalBeneficiaries;
    if (
      !sankalpa &&
      !priestPreference &&
      !location &&
      quantity <= 1 &&
      remote === undefined &&
      !beneficiaries
    ) {
      return undefined;
    }
    const notes = [
      sankalpa?.notes,
      remote ? 'Remote participation' : undefined,
    ]
      .filter(Boolean)
      .join('; ') || undefined;
    return {
      ...sankalpa,
      sponsorName: sankalpa?.sponsorName ?? '',
      ...(priestPreference ? { priestPreference } : {}),
      ...(location ? { location } : {}),
      ...(quantity > 1 ? { quantity } : {}),
      ...(remote !== undefined ? { remoteParticipation: remote } : {}),
      ...(beneficiaries ? { additionalBeneficiaries: beneficiaries } : {}),
      ...(notes ? { notes } : {}),
    };
  }

  private toBooking(row: BookingEntity): BookingRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      devoteeId: row.devoteeId,
      serviceId: row.serviceId,
      priestId: row.priestId,
      scheduledAt: row.scheduledAt,
      status: row.status as BookingStatus,
      amount: Number(row.amount),
      currency: row.currency as Currency,
      sankalpa: row.sankalpa as Booking['sankalpa'],
      receiptNumber: row.receiptNumber,
      checkoutReceiptId: row.checkoutReceiptId,
      channel: row.channel as Booking['channel'],
      paymentStatus: row.paymentStatus as PaymentStatus,
      honorariumAmount: row.honorariumAmount
        ? Number(row.honorariumAmount)
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private isSameDate(scheduledAt: Date, date: string): boolean {
    const iso = scheduledAt.toISOString().slice(0, 10);
    return iso === date.slice(0, 10);
  }

  private generateReceiptNumberSync(tenantId: string): string {
    const year = new Date().getFullYear();
    const counterKey = `${tenantId}:${year}`;
    const next = (this.receiptCounters.get(counterKey) ?? 1800) + 1;
    this.receiptCounters.set(counterKey, next);
    return `RCT-${year}-${String(next).padStart(4, '0')}`;
  }

  private async generateReceiptNumber(_tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RCT-${year}-`;
    const [bookingRepo, donationRepo] = await Promise.all([
      this.tenantData.bookings(),
      this.tenantData.donations(),
    ]);
    const [bookings, donations] = await Promise.all([
      bookingRepo
        .createQueryBuilder('b')
        .select(['b.receiptNumber'])
        .where('b.receiptNumber LIKE :prefix', { prefix: `${prefix}%` })
        .getMany(),
      donationRepo
        .createQueryBuilder('d')
        .select(['d.receiptNumber'])
        .where('d.receiptNumber LIKE :prefix', { prefix: `${prefix}%` })
        .getMany(),
    ]);
    const sequence = nextReceiptSequence(
      [...bookings, ...donations].map((r) => r.receiptNumber),
      year,
      1800,
    );
    return formatReceiptNumber(year, sequence);
  }

  private seedDemoBookings(): void {
    const now = new Date();

    if (this.scoped(DEMO_TENANT).length === 0) {
      const svBookings: Array<Omit<BookingRecord, 'createdAt' | 'updatedAt'>> = [
        {
          id: 'bkg-archana-rajan',
          tenantId: DEMO_TENANT,
          devoteeId: 'dev-rajan-krishnamurthy',
          serviceId: 'svc-archana',
          scheduledAt: new Date('2026-06-07T09:00:00.000Z'),
          status: BookingStatus.CONFIRMED,
          amount: 25,
          currency: Currency.USD,
          sankalpa: {
            sponsorName: 'Rajan Krishnamurthy',
            gotram: 'Bharadwaja',
            nakshatra: 'Rohini',
            beneficiaryName: 'Rajan Krishnamurthy',
          },
          receiptNumber: 'RCT-2026-1801',
          channel: 'app',
        },
        {
          id: 'bkg-abhishekam-patel',
          tenantId: DEMO_TENANT,
          devoteeId: 'dev-meena-patel',
          serviceId: 'svc-abhishekam',
          scheduledAt: new Date('2026-06-07T09:30:00.000Z'),
          status: BookingStatus.CONFIRMED,
          amount: 101,
          currency: Currency.USD,
          receiptNumber: 'RCT-2026-1802',
          channel: 'counter',
        },
      ];

      for (const booking of svBookings) {
        this.store.set(booking.id, { ...booking, createdAt: now, updatedAt: now });
      }
      this.receiptCounters.set(`${DEMO_TENANT}:2026`, 1802);
    }

    if (this.scoped(GANESHA_TEMPLE_ID).length === 0) {
      const ganeshaBookings: Array<Omit<BookingRecord, 'createdAt' | 'updatedAt'>> = [
        {
          id: 'sgt-bkg-archana-raj',
          tenantId: GANESHA_TEMPLE_ID,
          devoteeId: 'sgt-dev-raj-natarajan',
          serviceId: 'sgt-svc-ganesha-archana',
          scheduledAt: new Date('2026-06-06T15:00:00.000Z'),
          status: BookingStatus.CONFIRMED,
          amount: 15,
          currency: Currency.USD,
          sankalpa: {
            sponsorName: 'Raj Natarajan',
            gotram: 'Atri',
            occasion: '60th Birthday',
          },
          receiptNumber: 'RCT-2026-3101',
          channel: 'counter',
        },
        {
          id: 'sgt-bkg-abhishekam-raj',
          tenantId: GANESHA_TEMPLE_ID,
          devoteeId: 'sgt-dev-raj-natarajan',
          serviceId: 'sgt-svc-ganesha-abhishekam',
          scheduledAt: new Date('2026-06-14T14:00:00.000Z'),
          status: BookingStatus.CONFIRMED,
          amount: 125,
          currency: Currency.USD,
          sankalpa: { sponsorName: 'Raj & Swetha Natarajan', gotram: 'Atri' },
          receiptNumber: 'RCT-2026-3102',
          channel: 'app',
        },
        {
          id: 'sgt-bkg-archana-priya',
          tenantId: GANESHA_TEMPLE_ID,
          devoteeId: 'sgt-dev-priya-iyer',
          serviceId: 'sgt-svc-ganesha-archana',
          scheduledAt: new Date('2026-05-20T16:00:00.000Z'),
          status: BookingStatus.COMPLETED,
          amount: 15,
          currency: Currency.USD,
          channel: 'counter',
        },
      ];

      for (const booking of ganeshaBookings) {
        this.store.set(booking.id, { ...booking, createdAt: now, updatedAt: now });
      }
      this.receiptCounters.set(`${GANESHA_TEMPLE_ID}:2026`, 3102);
    }
  }
}
