import {
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  AuthUser,
  CreateStaffInput,
  Staff,
  StaffRole,
  UpdateStaffInput,
  GANESHA_TEMPLE_ID,
  SV_TEMPLE_ID,
  UserRole,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { StaffEntity } from '../../database/entities/tenant/staff.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { StaffLeaveService } from './staff-leave.service';

type StaffRecord = Staff & TenantEntity;

@Injectable()
export class StaffService extends BaseTenantService<StaffRecord> implements OnModuleInit {
  protected store = new Map<string, StaffRecord>();
  private leaveService?: StaffLeaveService;

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  /** Breaks circular DI with StaffLeaveService. */
  setLeaveService(leaveService: StaffLeaveService): void {
    this.leaveService = leaveService;
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedDemoStaff(SV_TEMPLE_ID);
      this.seedDemoStaff(GANESHA_TEMPLE_ID);
    }
  }

  private seedDemoStaff(tenantId: string): void {
    if (this.scoped(tenantId).length > 0) return;

    const now = new Date();
    const isGanesha = tenantId === GANESHA_TEMPLE_ID;
    const domain = isGanesha ? 'sgtemple.org' : 'svtemple.org';
    const priests: Array<Omit<StaffRecord, 'createdAt' | 'updatedAt'>> = [
      {
        id: isGanesha ? 'user-ganesha-priest-001' : 'user-priest-001',
        tenantId,
        name: isGanesha ? 'Sri Murugan' : 'Sri Raman',
        role: 'priest',
        email: `priest@${domain}`,
        title: 'Head Priest',
        department: 'Rituals',
        userId: isGanesha ? 'user-ganesha-priest-001' : 'user-priest-001',
        isActive: true,
      },
      {
        id: isGanesha ? 'user-ganesha-priest-002' : 'user-priest-002',
        tenantId,
        name: isGanesha ? 'Swami Ganesha' : 'Swami Venkat',
        role: 'priest',
        email: isGanesha ? `murugan@${domain}` : `venkat@${domain}`,
        department: 'Rituals',
        isActive: true,
      },
      {
        id: isGanesha ? 'user-ganesha-priest-003' : 'user-priest-003',
        tenantId,
        name: isGanesha ? 'Swami Iyer' : 'Swami Ramanujan',
        role: 'priest',
        email: isGanesha ? `iyer@${domain}` : `ramanujan@${domain}`,
        department: 'Rituals',
        isActive: true,
      },
    ];

    for (const priest of priests) {
      this.store.set(priest.id, { ...priest, createdAt: now, updatedAt: now });
    }
  }

  async findAll(
    tenantId: string,
    options?: { role?: StaffRole; includeInactive?: boolean },
  ): Promise<Staff[]> {
    const onLeave = await this.leaveService?.getStaffOnLeaveToday(tenantId);
    const records = await this.loadRecords(tenantId, options);
    return records.map(({ tenantId: _t, createdAt: _c, updatedAt: _u, ...staff }) => ({
      ...staff,
      onLeaveToday: onLeave?.has(staff.id),
    }));
  }

  private async loadRecords(
    tenantId: string,
    options?: { role?: StaffRole; includeInactive?: boolean },
  ): Promise<StaffRecord[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.staff();
      const where: { role?: StaffRole; isActive?: boolean } = {};
      if (options?.role) where.role = options.role;
      if (!options?.includeInactive) where.isActive = true;
      const rows = await repo.find({ where, order: { name: 'ASC' } });
      return rows.map((row) => ({
        ...this.toStaff(row),
        tenantId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    }

    this.seedDemoStaff(tenantId);
    let items = this.scoped(tenantId);
    if (!options?.includeInactive) {
      items = items.filter((s) => s.isActive);
    }
    if (options?.role) {
      items = items.filter((s) => s.role === options.role);
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async findOne(tenantId: string, id: string): Promise<Staff> {
    const onLeave = await this.leaveService?.getStaffOnLeaveToday(tenantId);

    if (this.usePostgres) {
      const repo = await this.tenantData.staff();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Staff ${id} not found`);
      }
      return this.toStaff(row, onLeave?.has(row.id));
    }

    this.seedDemoStaff(tenantId);
    const record = this.findOneScoped(tenantId, id);
    if (!record) {
      throw new NotFoundException(`Staff ${id} not found`);
    }
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...staff } = record;
    return { ...staff, onLeaveToday: onLeave?.has(staff.id) };
  }

  async create(tenantId: string, input: CreateStaffInput): Promise<Staff> {
    if (this.usePostgres) {
      const repo = await this.tenantData.staff();
      const row = await repo.save(
        repo.create({
          name: input.name.trim(),
          role: input.role,
          email: input.email?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          title: input.title?.trim() || undefined,
          department: input.department?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          userId: input.userId,
          isActive: true,
        }),
      );
      return this.toStaff(row);
    }

    this.seedDemoStaff(tenantId);
    const record = this.createEntity(tenantId, {
      name: input.name.trim(),
      role: input.role,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      title: input.title?.trim() || undefined,
      department: input.department?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      userId: input.userId,
      isActive: true,
    });
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...staff } = record;
    return staff;
  }

  async update(tenantId: string, id: string, input: UpdateStaffInput): Promise<Staff> {
    if (this.usePostgres) {
      const repo = await this.tenantData.staff();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Staff ${id} not found`);
      }
      if (input.name !== undefined) row.name = input.name.trim();
      if (input.role !== undefined) row.role = input.role;
      if (input.email !== undefined) row.email = input.email?.trim() || undefined;
      if (input.phone !== undefined) row.phone = input.phone?.trim() || undefined;
      if (input.title !== undefined) row.title = input.title?.trim() || undefined;
      if (input.department !== undefined) row.department = input.department?.trim() || undefined;
      if (input.notes !== undefined) row.notes = input.notes?.trim() || undefined;
      if (input.userId !== undefined) row.userId = input.userId ?? undefined;
      if (input.isActive !== undefined) row.isActive = input.isActive;
      const saved = await repo.save(row);
      return this.toStaff(saved);
    }

    this.seedDemoStaff(tenantId);
    const updated = this.updateEntity(tenantId, id, {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.email !== undefined && { email: input.email?.trim() || undefined }),
      ...(input.phone !== undefined && { phone: input.phone?.trim() || undefined }),
      ...(input.title !== undefined && { title: input.title?.trim() || undefined }),
      ...(input.department !== undefined && { department: input.department?.trim() || undefined }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || undefined }),
      ...(input.userId !== undefined && { userId: input.userId ?? undefined }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    } as Partial<StaffRecord>);
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...staff } = updated;
    return staff;
  }

  async deactivate(tenantId: string, id: string): Promise<Staff> {
    return this.update(tenantId, id, { isActive: false });
  }

  async getNameMap(tenantId: string): Promise<Map<string, string>> {
    const all = await this.loadRecords(tenantId, { includeInactive: true });
    return new Map(all.map((s) => [s.id, s.name]));
  }

  async resolveStaffIdForUser(tenantId: string, user: AuthUser): Promise<string | undefined> {
    const all = await this.loadRecords(tenantId, { includeInactive: true });
    const byUserId = all.find((s) => s.userId === user.id);
    if (byUserId) return byUserId.id;
    const byId = all.find((s) => s.id === user.id);
    if (byId) return byId.id;
    if (user.role === UserRole.PRIEST && user.email) {
      const byEmail = all.find(
        (s) => s.email?.toLowerCase() === user.email.toLowerCase() && s.role === 'priest',
      );
      return byEmail?.id;
    }
    return undefined;
  }

  private toStaff(row: StaffEntity, onLeaveToday?: boolean): Staff {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      phone: row.phone,
      title: row.title,
      department: row.department,
      notes: row.notes,
      userId: row.userId,
      isActive: row.isActive,
      onLeaveToday,
    };
  }
}
