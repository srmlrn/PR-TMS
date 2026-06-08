import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthUser,
  CreateStaffLeaveInput,
  StaffLeave,
  StaffLeaveStatus,
  UpdateStaffLeaveInput,
  UserRole,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { StaffLeaveEntity } from '../../database/entities/tenant/staff-leave.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { StaffService } from './staff.service';

type StaffLeaveRecord = StaffLeave & TenantEntity;

@Injectable()
export class StaffLeaveService extends BaseTenantService<StaffLeaveRecord> {
  protected store = new Map<string, StaffLeaveRecord>();

  constructor(
    private readonly tenantData: TenantDataService,
    private readonly staffService: StaffService,
  ) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  async findAll(
    tenantId: string,
    filters?: {
      staffId?: string;
      status?: StaffLeaveStatus;
      from?: string;
      to?: string;
    },
  ): Promise<StaffLeave[]> {
    const items = await this.loadRecords(tenantId, filters);
    const staffNames = await this.staffService.getNameMap(tenantId);
    return items.map((l) => this.toPublic(l, staffNames.get(l.staffId)));
  }

  private async loadRecords(
    tenantId: string,
    filters?: {
      staffId?: string;
      status?: StaffLeaveStatus;
      from?: string;
      to?: string;
    },
  ): Promise<StaffLeaveRecord[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.staffLeaves();
      const qb = repo.createQueryBuilder('l').orderBy('l.requestedAt', 'DESC');

      if (filters?.staffId) {
        qb.andWhere('l.staffId = :staffId', { staffId: filters.staffId });
      }
      if (filters?.status) {
        qb.andWhere('l.status = :status', { status: filters.status });
      }
      if (filters?.from) {
        qb.andWhere('l.endDate >= :from', { from: filters.from });
      }
      if (filters?.to) {
        qb.andWhere('l.startDate <= :to', { to: filters.to });
      }

      const rows = await qb.getMany();
      return rows.map((r) => this.toRecord(tenantId, r));
    }

    let items = this.scoped(tenantId);
    if (filters?.staffId) {
      items = items.filter((l) => l.staffId === filters.staffId);
    }
    if (filters?.status) {
      items = items.filter((l) => l.status === filters.status);
    }
    if (filters?.from) {
      items = items.filter((l) => l.endDate >= filters.from!);
    }
    if (filters?.to) {
      items = items.filter((l) => l.startDate <= filters.to!);
    }
    return items.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  async create(
    tenantId: string,
    input: CreateStaffLeaveInput,
    user: AuthUser,
  ): Promise<StaffLeave> {
    await this.staffService.findOne(tenantId, input.staffId);

    if (user.role === UserRole.PRIEST) {
      const ownStaffId = await this.staffService.resolveStaffIdForUser(tenantId, user);
      if (ownStaffId !== input.staffId) {
        throw new ForbiddenException('Priests may only request leave for themselves');
      }
    }

    if (input.endDate < input.startDate) {
      throw new ForbiddenException('End date must be on or after start date');
    }

    const now = new Date().toISOString();

    if (this.usePostgres) {
      const repo = await this.tenantData.staffLeaves();
      const row = await repo.save(
        repo.create({
          staffId: input.staffId,
          type: input.type,
          startDate: input.startDate,
          endDate: input.endDate,
          status: 'pending',
          reason: input.reason?.trim() || undefined,
        }),
      );
      const record = this.toRecord(tenantId, row);
      const staffNames = await this.staffService.getNameMap(tenantId);
      return this.toPublic(record, staffNames.get(record.staffId));
    }

    const record = this.createEntity(tenantId, {
      staffId: input.staffId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'pending',
      reason: input.reason?.trim() || undefined,
      requestedAt: now,
    } as Omit<StaffLeaveRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>);

    const staffNames = await this.staffService.getNameMap(tenantId);
    return this.toPublic(record, staffNames.get(record.staffId));
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateStaffLeaveInput,
  ): Promise<StaffLeave> {
    const existing = await this.loadOne(tenantId, id);
    if (!existing) {
      throw new NotFoundException(`Leave ${id} not found`);
    }

    const reviewedAt =
      input.status && input.status !== 'pending' ? new Date().toISOString() : existing.reviewedAt;

    if (this.usePostgres) {
      const repo = await this.tenantData.staffLeaves();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Leave ${id} not found`);
      }
      row.status = input.status ?? row.status;
      row.adminNote = input.adminNote !== undefined ? input.adminNote : row.adminNote;
      if (reviewedAt) {
        row.reviewedAt = new Date(reviewedAt);
      }
      const saved = await repo.save(row);
      const record = this.toRecord(tenantId, saved);
      const staffNames = await this.staffService.getNameMap(tenantId);
      return this.toPublic(record, staffNames.get(record.staffId));
    }

    const updated = this.updateEntity(tenantId, id, {
      status: input.status ?? existing.status,
      adminNote: input.adminNote !== undefined ? input.adminNote : existing.adminNote,
      reviewedAt,
    } as Partial<StaffLeaveRecord>);

    const staffNames = await this.staffService.getNameMap(tenantId);
    return this.toPublic(updated, staffNames.get(updated.staffId));
  }

  async getStaffOnLeaveToday(tenantId: string): Promise<Set<string>> {
    const today = new Date().toISOString().slice(0, 10);
    const leaves = await this.loadRecords(tenantId, {
      status: 'approved',
      from: today,
      to: today,
    });
    return new Set(leaves.map((l) => l.staffId));
  }

  private async loadOne(tenantId: string, id: string): Promise<StaffLeaveRecord | undefined> {
    if (this.usePostgres) {
      const repo = await this.tenantData.staffLeaves();
      const row = await repo.findOne({ where: { id } });
      return row ? this.toRecord(tenantId, row) : undefined;
    }
    return this.findOneScoped(tenantId, id);
  }

  private toRecord(tenantId: string, row: StaffLeaveEntity): StaffLeaveRecord {
    return {
      id: row.id,
      tenantId,
      staffId: row.staffId,
      type: row.type,
      startDate:
        typeof row.startDate === 'string'
          ? row.startDate
          : (row.startDate as unknown as Date).toISOString().slice(0, 10),
      endDate:
        typeof row.endDate === 'string'
          ? row.endDate
          : (row.endDate as unknown as Date).toISOString().slice(0, 10),
      status: row.status,
      reason: row.reason,
      adminNote: row.adminNote,
      requestedAt: row.requestedAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString(),
      createdAt: row.requestedAt,
      updatedAt: row.updatedAt,
    };
  }

  private toPublic(record: StaffLeaveRecord, staffName?: string): StaffLeave {
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...leave } = record;
    return { ...leave, staffName };
  }
}
