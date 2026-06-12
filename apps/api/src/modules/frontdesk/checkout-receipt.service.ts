import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CheckoutReceipt,
  CheckoutReceiptLine,
  Currency,
  DevoteeProfileBooking,
  DevoteeProfileDonation,
  DevoteeProfileInvoice,
  PaymentStatus,
  ShareCheckoutReceiptResult,
} from '@tms/types';
import { v4 as uuidv4 } from 'uuid';
import { CheckoutReceiptEntity } from '../../database/entities/tenant/checkout-receipt.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import {
  formatReceiptNumber,
  nextReceiptSequence,
} from '../../common/utils/receipt-sequence.util';
import { NotificationsService } from '../notifications/notifications.service';
import { DevoteeService } from '../devotee/devotee.service';
import { SevaCatalogService } from '../booking/seva-catalog.service';

type CheckoutReceiptRecord = CheckoutReceiptEntity & { tenantId?: string };

const LEGACY_GROUP_WINDOW_MS = 30_000;

interface LegacyLineItem {
  kind: 'booking' | 'donation';
  ts: number;
  isCounter: boolean;
  receiptNumber?: string;
  line: CheckoutReceiptLine;
  paymentStatus?: string;
}

@Injectable()
export class CheckoutReceiptService {
  private readonly memoryStore = new Map<string, CheckoutReceiptRecord>();
  private readonly receiptCounters = new Map<string, number>();

  constructor(
    private readonly tenantData: TenantDataService,
    private readonly devoteeService: DevoteeService,
    private readonly sevaCatalogService: SevaCatalogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  private memoryKey(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  async generateReceiptNumber(tenantId: string): Promise<string> {
    if (this.usePostgres) {
      const bookingRepo = await this.tenantData.bookings();
      const donationRepo = await this.tenantData.donations();
      const year = new Date().getFullYear();
      const prefix = `RCT-${year}-`;
      const bookings = await bookingRepo
        .createQueryBuilder('b')
        .select(['b.receiptNumber'])
        .where('b.receiptNumber LIKE :prefix', { prefix: `${prefix}%` })
        .getMany();
      const donations = await donationRepo
        .createQueryBuilder('d')
        .select(['d.receiptNumber'])
        .where('d.receiptNumber LIKE :prefix', { prefix: `${prefix}%` })
        .getMany();
      const seq = nextReceiptSequence(
        [...bookings, ...donations].map((r) => r.receiptNumber),
        year,
      );
      return formatReceiptNumber(year, seq);
    }

    const year = new Date().getFullYear();
    const key = `${tenantId}:${year}`;
    const next = (this.receiptCounters.get(key) ?? 3100) + 1;
    this.receiptCounters.set(key, next);
    return formatReceiptNumber(year, next);
  }

  async createForCheckout(
    tenantId: string,
    input: {
      devoteeId: string;
      paymentSessionId?: string;
      grandTotal: number;
      currency: Currency;
      channel?: string;
      paymentMethod?: string;
      notes?: string;
    },
  ): Promise<{ id: string; receiptNumber: string }> {
    const receiptNumber = await this.generateReceiptNumber(tenantId);
    const id = uuidv4();

    if (this.usePostgres) {
      const repo = await this.tenantData.checkoutReceipts();
      const entity = repo.create({
        id,
        receiptNumber,
        devoteeId: input.devoteeId,
        paymentSessionId: input.paymentSessionId,
        grandTotal: input.grandTotal,
        currency: input.currency,
        channel: input.channel ?? 'counter',
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      });
      await repo.save(entity);
      return { id, receiptNumber };
    }

    const row: CheckoutReceiptRecord = {
      id,
      receiptNumber,
      devoteeId: input.devoteeId,
      paymentSessionId: input.paymentSessionId,
      grandTotal: input.grandTotal,
      currency: input.currency,
      channel: input.channel ?? 'counter',
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      issuedAt: new Date(),
      tenantId,
    };
    this.memoryStore.set(this.memoryKey(tenantId, id), row);
    return { id, receiptNumber };
  }

  async findOne(tenantId: string, id: string): Promise<CheckoutReceipt> {
    const receipt = await this.loadReceiptRow(tenantId, id);
    return this.assembleReceipt(tenantId, receipt);
  }

  async shareByEmail(
    tenantId: string,
    id: string,
    email?: string,
  ): Promise<ShareCheckoutReceiptResult> {
    const receipt = await this.assembleReceipt(tenantId, await this.loadReceiptRow(tenantId, id));
    const recipient = email?.trim() || receipt.devoteeEmail;
    if (!recipient) {
      throw new NotFoundException('No email on file for this devotee.');
    }

    await this.notificationsService.send({
      templateId: 'pos-invoice',
      channel: 'email',
      to: recipient,
      metadata: {
        name: receipt.devoteeName ?? 'Devotee',
        receipt: receipt.receiptNumber,
        amount: `${receipt.currency} ${receipt.grandTotal.toFixed(2)}`,
        lines: String(receipt.lines.length),
        date: new Date(receipt.issuedAt).toLocaleDateString(),
      },
    });

    return {
      queued: true,
      channel: 'email',
      recipient,
      message: `Invoice ${receipt.receiptNumber} queued for ${recipient}.`,
    };
  }

  async buildProfileInvoices(
    tenantId: string,
    devoteeId: string,
    bookings: DevoteeProfileBooking[],
    donations: DevoteeProfileDonation[],
    serviceNames: Map<string, string>,
  ): Promise<DevoteeProfileInvoice[]> {
    const invoices: DevoteeProfileInvoice[] = [];
    const linkedBookingIds = new Set<string>();
    const linkedDonationIds = new Set<string>();

    if (this.usePostgres) {
      const repo = await this.tenantData.checkoutReceipts();
      const rows = await repo.find({
        where: { devoteeId },
        order: { issuedAt: 'DESC' },
        take: 40,
      });

      for (const row of rows) {
        const lines = await this.loadLinesForReceipt(tenantId, row.id, serviceNames);
        for (const line of lines) {
          if (line.kind === 'booking') linkedBookingIds.add(line.id);
          else linkedDonationIds.add(line.id);
        }
        invoices.push(this.toProfileInvoice(row, lines));
      }
    } else {
      for (const row of this.memoryStore.values()) {
        if (row.tenantId !== tenantId || row.devoteeId !== devoteeId) continue;
        const lines = await this.loadLinesForReceipt(tenantId, row.id, serviceNames);
        for (const line of lines) {
          if (line.kind === 'booking') linkedBookingIds.add(line.id);
          else linkedDonationIds.add(line.id);
        }
        invoices.push(this.toProfileInvoice(row, lines));
      }
      invoices.sort(
        (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
      );
    }

    const legacyItems: LegacyLineItem[] = [];
    for (const b of bookings) {
      if (linkedBookingIds.has(b.id)) continue;
      legacyItems.push({
        kind: 'booking',
        ts: new Date(b.scheduledAt).getTime(),
        isCounter: b.channel === 'counter',
        receiptNumber: b.receiptNumber,
        paymentStatus: b.paymentStatus,
        line: {
          kind: 'booking',
          id: b.id,
          description: serviceNames.get(b.serviceId) ?? b.serviceId,
          amount: b.amount,
          currency: b.currency as Currency,
          serviceId: b.serviceId,
          scheduledAt: b.scheduledAt,
          paymentStatus: b.paymentStatus,
          checkedIn: b.checkedIn,
        },
      });
    }
    for (const d of donations) {
      if (linkedDonationIds.has(d.id)) continue;
      legacyItems.push({
        kind: 'donation',
        ts: new Date(d.createdAt).getTime(),
        isCounter:
          d.purpose.startsWith('Counter') || d.purpose.startsWith('Article sale'),
        receiptNumber: d.receiptNumber,
        paymentStatus: d.paymentStatus,
        line: {
          kind: 'donation',
          id: d.id,
          description: d.purpose,
          amount: d.amount,
          currency: d.currency as Currency,
          paymentStatus: d.paymentStatus,
        },
      });
    }

    legacyItems.sort((a, b) => b.ts - a.ts);
    invoices.push(...this.groupLegacyInvoices(legacyItems));
    invoices.sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
    );
    return invoices.slice(0, 40);
  }

  private groupLegacyInvoices(items: LegacyLineItem[]): DevoteeProfileInvoice[] {
    const invoices: DevoteeProfileInvoice[] = [];
    let batch: LegacyLineItem[] = [];

    const flush = () => {
      if (batch.length === 0) return;
      const lines = batch.map((item) => item.line);
      const grandTotal = Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
      const receiptNumber =
        batch.length === 1
          ? batch[0].receiptNumber ?? `INV-${batch[0].line.id.slice(0, 8).toUpperCase()}`
          : batch.find((b) => b.receiptNumber)?.receiptNumber ??
            `INV-${new Date(batch[0].ts).toISOString().slice(0, 10).replace(/-/g, '')}`;

      invoices.push({
        id: `legacy-${batch.map((b) => b.line.id).join('-')}`,
        receiptNumber,
        issuedAt: new Date(batch[0].ts).toISOString(),
        grandTotal,
        currency: lines[0]?.currency ?? Currency.USD,
        channel: batch[0].isCounter ? 'counter' : batch[0].line.kind === 'booking' ? 'app' : 'online',
        lineCount: lines.length,
        lines,
        paymentStatus: batch.every((b) => b.paymentStatus === PaymentStatus.PAID)
          ? PaymentStatus.PAID
          : batch[0].paymentStatus,
      });
      batch = [];
    };

    for (const item of items) {
      if (!item.isCounter) {
        flush();
        batch = [item];
        flush();
        continue;
      }
      if (batch.length === 0 || batch[0].ts - item.ts <= LEGACY_GROUP_WINDOW_MS) {
        batch.push(item);
      } else {
        flush();
        batch = [item];
      }
    }
    flush();
    return invoices;
  }

  private toProfileInvoice(
    row: CheckoutReceiptEntity,
    lines: CheckoutReceiptLine[],
  ): DevoteeProfileInvoice {
    return {
      id: row.id,
      receiptNumber: row.receiptNumber,
      issuedAt: row.issuedAt.toISOString(),
      grandTotal: Number(row.grandTotal),
      currency: row.currency as Currency,
      channel: row.channel,
      lineCount: lines.length,
      lines,
      paymentStatus: lines.every((l) => l.paymentStatus === PaymentStatus.PAID)
        ? PaymentStatus.PAID
        : lines[0]?.paymentStatus,
    };
  }

  private async loadReceiptRow(
    tenantId: string,
    id: string,
  ): Promise<CheckoutReceiptEntity> {
    if (this.usePostgres) {
      const repo = await this.tenantData.checkoutReceipts();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Checkout receipt ${id} not found`);
      }
      return row;
    }

    const row = this.memoryStore.get(this.memoryKey(tenantId, id));
    if (!row) {
      throw new NotFoundException(`Checkout receipt ${id} not found`);
    }
    return row;
  }

  private async assembleReceipt(
    tenantId: string,
    row: CheckoutReceiptEntity,
  ): Promise<CheckoutReceipt> {
    const devotee = await this.devoteeService.findOne(tenantId, row.devoteeId);
    const serviceNames = new Map<string, string>();
    const catalogServices = await this.sevaCatalogService.findAll(tenantId);
    for (const svc of catalogServices) {
      serviceNames.set(svc.id, svc.name);
    }
    const lines = await this.loadLinesForReceipt(tenantId, row.id, serviceNames);

    return {
      id: row.id,
      receiptNumber: row.receiptNumber,
      devoteeId: row.devoteeId,
      devoteeName: `${devotee.firstName} ${devotee.lastName}`.trim(),
      devoteeEmail: devotee.email,
      paymentSessionId: row.paymentSessionId,
      grandTotal: Number(row.grandTotal),
      currency: row.currency as Currency,
      channel: row.channel,
      paymentMethod: row.paymentMethod,
      notes: row.notes,
      issuedAt: row.issuedAt.toISOString(),
      lines,
    };
  }

  private async loadLinesForReceipt(
    tenantId: string,
    checkoutReceiptId: string,
    serviceNames: Map<string, string>,
  ): Promise<CheckoutReceiptLine[]> {
    const lines: CheckoutReceiptLine[] = [];

    if (this.usePostgres) {
      const bookingRepo = await this.tenantData.bookings();
      const donationRepo = await this.tenantData.donations();
      const bookings = await bookingRepo.find({ where: { checkoutReceiptId } });
      const donations = await donationRepo.find({ where: { checkoutReceiptId } });

      for (const b of bookings) {
        lines.push({
          kind: 'booking',
          id: b.id,
          description: serviceNames.get(b.serviceId) ?? b.serviceId,
          amount: Number(b.amount),
          currency: b.currency as Currency,
          serviceId: b.serviceId,
          scheduledAt: b.scheduledAt.toISOString(),
          paymentStatus: b.paymentStatus,
        });
      }
      for (const d of donations) {
        lines.push({
          kind: 'donation',
          id: d.id,
          description: d.purpose,
          amount: Number(d.amount),
          currency: d.currency as Currency,
          paymentStatus: d.paymentStatus,
        });
      }
    }

    return lines.sort((a, b) => a.description.localeCompare(b.description));
  }
}
