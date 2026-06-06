import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  Booking,
  BookingStatus,
  CreateBookingInput,
  Currency,
  PaginatedResponse,
  PaymentStatus,
  TaxReceipt,
  getTenantBranding,
} from '@tms/types';
import { PaymentService } from '../payment/payment.service';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { BookingEntity } from '../../database/entities/tenant/booking.entity';
import { TenantDataService } from '../../database/tenant-data.service';
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

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt must be a valid ISO date-time');
    }

    await this.assertNoConflict(tenantId, input.serviceId, scheduledAt, service.durationMinutes);

    let paymentStatus = PaymentStatus.PAID;
    const paidSession = await this.paymentService.enforcePaidCheckout(
      tenantId,
      input.paymentSessionId,
      service.price,
      service.currency,
    );
    if (paidSession) {
      paymentStatus = paidSession.status;
    }

    const sankalpa = this.buildSankalpa(input);

    if (this.usePostgres) {
      const repo = await this.tenantData.bookings();
      const entity = repo.create({
        devoteeId: input.devoteeId,
        serviceId: input.serviceId,
        scheduledAt,
        status: BookingStatus.CONFIRMED,
        amount: service.price,
        currency: service.currency,
        sankalpa: sankalpa as Record<string, string> | undefined,
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
      amount: service.price,
      currency: service.currency,
      sankalpa,
      receiptNumber: this.generateReceiptNumberSync(tenantId),
      channel: input.channel ?? 'app',
      paymentStatus,
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
    return {
      receiptNumber: booking.receiptNumber ?? `BKG-${booking.id.slice(0, 8)}`,
      amount: booking.amount,
      currency: booking.currency,
      devoteeId: booking.devoteeId,
      purpose: `Seva booking — ${booking.serviceId}`,
      issuedAt: booking.createdAt.toISOString(),
      templeName: getTenantBranding(tenantId).name,
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
    const slots = await this.sevaCatalogService.getSlotsForDate(
      tenantId,
      serviceId,
      date,
      bookedRanges,
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

  private buildSankalpa(input: CreateBookingInput): Booking['sankalpa'] | undefined {
    const { sankalpa, priestPreference } = input;
    if (!sankalpa && !priestPreference) {
      return undefined;
    }
    return {
      ...sankalpa,
      sponsorName: sankalpa?.sponsorName ?? '',
      ...(priestPreference ? { priestPreference } : {}),
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

  private async generateReceiptNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counterKey = `${tenantId}:${year}`;
    const next = (this.receiptCounters.get(counterKey) ?? 1800) + 1;
    this.receiptCounters.set(counterKey, next);

    const repo = await this.tenantData.bookings();
    const existing = await repo
      .createQueryBuilder('b')
      .where('b.receiptNumber LIKE :prefix', { prefix: `RCT-${year}-%` })
      .getMany();

    const existingMax = existing
      .map((b) => parseInt(b.receiptNumber?.split('-')[2] ?? '0', 10))
      .reduce((max, n) => Math.max(max, n), 0);

    const sequence = Math.max(next, existingMax + 1);
    this.receiptCounters.set(counterKey, sequence);
    return `RCT-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private seedDemoBookings(): void {
    if (this.scoped(DEMO_TENANT).length > 0) {
      return;
    }

    const now = new Date();

    const seedBookings: Array<Omit<BookingRecord, 'createdAt' | 'updatedAt'>> = [
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

    for (const booking of seedBookings) {
      this.store.set(booking.id, {
        ...booking,
        createdAt: now,
        updatedAt: now,
      });
    }

    this.receiptCounters.set(`${DEMO_TENANT}:2026`, 1802);
  }
}
