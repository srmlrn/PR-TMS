import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Currency,
  FinanceSummary,
  PaginatedResponse,
  TaxComplianceStatus,
  VendorPayment,
} from '@tms/types';
import { v4 as uuidv4 } from 'uuid';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { VendorPaymentEntity } from '../../database/entities/tenant/vendor-payment.entity';
import { TenantDataService } from '../../database/tenant-data.service';

type VendorPaymentRecord = VendorPayment & TenantEntity;

@Injectable()
export class FinanceService
  extends BaseTenantService<VendorPaymentRecord>
  implements OnModuleInit
{
  protected store = new Map<string, VendorPaymentRecord>();

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedVendorPayments('00000000-0000-0000-0000-000000000001');
    }
  }

  private seedVendorPayments(tenantId: string): void {
    const existing = this.scoped(tenantId);
    if (existing.length > 0) {
      return;
    }

    this.createVendorPayment(tenantId, {
      vendorId: uuidv4(),
      vendorName: 'Fresh Flowers Co.',
      amount: 450,
      currency: Currency.USD,
      dueDate: new Date('2026-06-10'),
      status: 'pending',
    });

    this.createVendorPayment(tenantId, {
      vendorId: uuidv4(),
      vendorName: 'Annadanam Caterer',
      amount: 1_200,
      currency: Currency.USD,
      dueDate: new Date('2026-06-15'),
      status: 'pending',
    });
  }

  private createVendorPayment(
    tenantId: string,
    data: Omit<VendorPaymentRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): VendorPaymentRecord {
    return this.createEntity(tenantId, data);
  }

  private ensureSeeded(tenantId: string): void {
    if (this.scoped(tenantId).length === 0) {
      this.seedVendorPayments(tenantId);
    }
  }

  async getSummary(tenantId: string): Promise<FinanceSummary> {
    if (this.usePostgres) {
      const repo = await this.tenantData.vendorPayments();
      const payments = await repo.find();
      const payables = payments
        .filter((p) => p.status === 'pending' || p.status === 'overdue')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        incomeMtd: 54_200,
        expensesMtd: 14_800,
        receivables: 2_400,
        payables,
        currency: Currency.USD,
      };
    }

    this.ensureSeeded(tenantId);
    const payments = this.scoped(tenantId);
    const payables = payments
      .filter((p) => p.status === 'pending' || p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      incomeMtd: 54_200,
      expensesMtd: 14_800,
      receivables: 2_400,
      payables,
      currency: Currency.USD,
    };
  }

  async getVendorPayments(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<VendorPaymentRecord>> {
    if (this.usePostgres) {
      const repo = await this.tenantData.vendorPayments();
      const [rows, total] = await repo.findAndCount({
        order: { dueDate: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        data: rows.map((r) => this.toVendorPayment(r)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    this.ensureSeeded(tenantId);
    const items = this.scoped(tenantId).sort(
      (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
    );
    return this.paginate(items, page, limit);
  }

  async getTaxCompliance(tenantId: string): Promise<TaxComplianceStatus[]> {
    if (!this.usePostgres) {
      this.ensureSeeded(tenantId);
    }

    return [
      {
        jurisdiction: 'usa',
        label: 'USA — IRS statements ready · FY 2025',
        readyCount: 148,
        pendingCount: 0,
      },
      {
        jurisdiction: 'india',
        label: 'India — 10BD export ready · 80G receipts pending PAN',
        readyCount: 0,
        pendingCount: 91,
      },
      {
        jurisdiction: 'canada',
        label: 'Canada — CRA receipts generated',
        readyCount: 22,
        pendingCount: 0,
      },
    ];
  }

  private toVendorPayment(row: VendorPaymentEntity): VendorPaymentRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      amount: Number(row.amount),
      currency: row.currency as Currency,
      dueDate: new Date(row.dueDate),
      status: row.status as VendorPayment['status'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
