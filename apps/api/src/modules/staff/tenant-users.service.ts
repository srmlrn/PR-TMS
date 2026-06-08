import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateTenantUserInput,
  TenantUser,
  TenantUserRole,
  UpdateTenantUserInput,
} from '@tms/types';
import { v4 as uuidv4 } from 'uuid';
import { TenantUserEntity } from '../../database/entities/control/tenant-user.entity';

interface TenantUserRecord {
  id: string;
  tenantId: string;
  email: string;
  password: string;
  name: string;
  role: TenantUserRole;
  staffId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const memoryStore = new Map<string, TenantUserRecord>();

@Injectable()
export class TenantUsersService {
  constructor(
    @Optional()
    @InjectRepository(TenantUserEntity)
    private readonly repo: Repository<TenantUserEntity> | undefined,
  ) {}

  private get usePostgres(): boolean {
    return process.env.STORAGE_MODE === 'postgres';
  }

  async findAll(tenantId: string): Promise<TenantUser[]> {
    const rows = await this.loadAll(tenantId);
    return rows.map((r) => this.toPublic(r));
  }

  async findByEmail(tenantId: string, email: string): Promise<TenantUserRecord | undefined> {
    const normalized = email.toLowerCase();
    if (!this.usePostgres) {
      return [...memoryStore.values()].find(
        (u) => u.tenantId === tenantId && u.email.toLowerCase() === normalized && u.isActive,
      );
    }
    const row = await this.repo!.findOne({
      where: { tenantId, email: normalized, isActive: true },
    });
    return row ? this.fromEntity(row) : undefined;
  }

  async findByEmailAnyTenant(email: string): Promise<TenantUserRecord | undefined> {
    const normalized = email.toLowerCase();
    if (!this.usePostgres) {
      return [...memoryStore.values()].find(
        (u) => u.email.toLowerCase() === normalized && u.isActive,
      );
    }
    const row = await this.repo!.findOne({ where: { email: normalized, isActive: true } });
    return row ? this.fromEntity(row) : undefined;
  }

  async findOne(tenantId: string, id: string): Promise<TenantUser> {
    const row = await this.loadOne(tenantId, id);
    if (!row) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.toPublic(row);
  }

  async create(tenantId: string, input: CreateTenantUserInput): Promise<TenantUser> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.findByEmailAnyTenant(email);
    if (existing) {
      throw new ConflictException(`Email ${email} is already registered`);
    }

    const now = new Date();
    const record: TenantUserRecord = {
      id: uuidv4(),
      tenantId,
      email,
      password: input.password,
      name: input.name.trim(),
      role: input.role,
      staffId: input.staffId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.save(record);
    return this.toPublic(record);
  }

  async update(tenantId: string, id: string, input: UpdateTenantUserInput): Promise<TenantUser> {
    const existing = await this.loadOne(tenantId, id);
    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (input.email && input.email.trim().toLowerCase() !== existing.email) {
      const conflict = await this.findByEmailAnyTenant(input.email);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Email ${input.email} is already registered`);
      }
    }

    const updated: TenantUserRecord = {
      ...existing,
      email: input.email?.trim().toLowerCase() ?? existing.email,
      name: input.name?.trim() ?? existing.name,
      role: input.role ?? existing.role,
      password: input.password?.trim() ? input.password : existing.password,
      staffId: input.staffId === null ? undefined : (input.staffId ?? existing.staffId),
      isActive: input.isActive ?? existing.isActive,
      updatedAt: new Date(),
    };

    await this.save(updated);
    return this.toPublic(updated);
  }

  verifyPassword(record: TenantUserRecord, password: string): boolean {
    return record.password === password;
  }

  private async loadAll(tenantId: string): Promise<TenantUserRecord[]> {
    if (!this.usePostgres) {
      return [...memoryStore.values()]
        .filter((u) => u.tenantId === tenantId)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    const rows = await this.repo!.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
    return rows.map((r) => this.fromEntity(r));
  }

  private async loadOne(tenantId: string, id: string): Promise<TenantUserRecord | undefined> {
    if (!this.usePostgres) {
      const row = memoryStore.get(id);
      return row?.tenantId === tenantId ? row : undefined;
    }
    const row = await this.repo!.findOne({ where: { id, tenantId } });
    return row ? this.fromEntity(row) : undefined;
  }

  private async save(record: TenantUserRecord): Promise<void> {
    if (!this.usePostgres) {
      memoryStore.set(record.id, record);
      return;
    }

    const existing = await this.repo!.findOne({ where: { id: record.id } });
    if (existing) {
      await this.repo!.save({
        ...existing,
        email: record.email,
        password: record.password,
        name: record.name,
        role: record.role,
        staffId: record.staffId,
        isActive: record.isActive,
      });
      return;
    }

    await this.repo!.save({
      id: record.id,
      tenantId: record.tenantId,
      email: record.email,
      password: record.password,
      name: record.name,
      role: record.role,
      staffId: record.staffId,
      isActive: record.isActive,
    });
  }

  private fromEntity(row: TenantUserEntity): TenantUserRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role,
      staffId: row.staffId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toPublic(record: TenantUserRecord): TenantUser {
    return {
      id: record.id,
      tenantId: record.tenantId,
      email: record.email,
      name: record.name,
      role: record.role,
      staffId: record.staffId,
      isActive: record.isActive,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
