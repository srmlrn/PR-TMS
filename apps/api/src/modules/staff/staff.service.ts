import { Injectable, OnModuleInit } from '@nestjs/common';
import { Staff, StaffRole } from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { StaffEntity } from '../../database/entities/tenant/staff.entity';
import { TenantDataService } from '../../database/tenant-data.service';

type StaffRecord = Staff & TenantEntity;

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class StaffService extends BaseTenantService<StaffRecord> implements OnModuleInit {
  protected store = new Map<string, StaffRecord>();

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedDemoStaff(DEMO_TENANT);
    }
  }

  private seedDemoStaff(tenantId: string): void {
    if (this.scoped(tenantId).length > 0) return;

    const now = new Date();
    const priests: Array<Omit<StaffRecord, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'user-priest-001',
        tenantId,
        name: 'Sri Raman',
        role: 'priest',
        email: 'priest@svtemple.org',
        isActive: true,
      },
      {
        id: 'user-priest-002',
        tenantId,
        name: 'Swami Venkat',
        role: 'priest',
        email: 'venkat@svtemple.org',
        isActive: true,
      },
      {
        id: 'user-priest-003',
        tenantId,
        name: 'Swami Ramanujan',
        role: 'priest',
        email: 'ramanujan@svtemple.org',
        isActive: true,
      },
    ];

    for (const priest of priests) {
      this.store.set(priest.id, { ...priest, createdAt: now, updatedAt: now });
    }
  }

  async findAll(tenantId: string, role?: StaffRole): Promise<Staff[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.staff();
      const rows = role
        ? await repo.find({ where: { role, isActive: true }, order: { name: 'ASC' } })
        : await repo.find({ where: { isActive: true }, order: { name: 'ASC' } });
      return rows.map((row) => this.toStaff(row));
    }

    this.seedDemoStaff(tenantId);
    let items = this.scoped(tenantId).filter((s) => s.isActive);
    if (role) {
      items = items.filter((s) => s.role === role);
    }
    return items
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ tenantId: _t, createdAt: _c, updatedAt: _u, ...staff }) => staff);
  }

  private toStaff(row: StaffEntity): Staff {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      phone: row.phone,
      isActive: row.isActive,
    };
  }
}
