import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  CreatePosProductInput,
  Currency,
  DEMO_TENANT_IDS,
  POS_SALES_CATALOG,
  PosProduct,
  UpdatePosProductInput,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { PosProductEntity } from '../../database/entities/tenant/pos-product.entity';
import { TenantDataService } from '../../database/tenant-data.service';

type PosProductRecord = PosProduct & TenantEntity;

@Injectable()
export class PosCatalogService extends BaseTenantService<PosProductRecord> implements OnModuleInit {
  protected store = new Map<string, PosProductRecord>();

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      for (const tenantId of DEMO_TENANT_IDS) {
        this.seedProducts(tenantId);
      }
    }
  }

  async findAllActive(tenantId: string): Promise<PosProductRecord[]> {
    const all = await this.findAllAdmin(tenantId);
    return all.filter((p) => p.isActive);
  }

  async findAllAdmin(tenantId: string): Promise<PosProductRecord[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.posProducts();
      let rows = await repo.find({ order: { name: 'ASC' } });
      if (rows.length === 0) {
        rows = await repo.save(
          POS_SALES_CATALOG.map((item) =>
            repo.create({
              name: item.name,
              price: item.price,
              currency: item.currency,
              isActive: true,
            }),
          ),
        );
      }
      return rows.map((r) => this.toProduct(r));
    }

    this.ensureSeeded(tenantId);
    return this.scoped(tenantId).sort((a, b) => a.name.localeCompare(b.name));
  }

  async findOne(tenantId: string, id: string): Promise<PosProductRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.posProducts();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Product ${id} not found`);
      }
      return this.toProduct(row);
    }

    this.ensureSeeded(tenantId);
    const product = this.findOneScoped(tenantId, id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async create(tenantId: string, input: CreatePosProductInput): Promise<PosProductRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.posProducts();
      const row = await repo.save(
        repo.create({
          name: input.name.trim(),
          price: input.price,
          currency: input.currency ?? Currency.USD,
          isActive: input.isActive ?? true,
        }),
      );
      return this.toProduct(row);
    }

    this.ensureSeeded(tenantId);
    return this.createEntity(tenantId, {
      name: input.name.trim(),
      price: input.price,
      currency: input.currency ?? Currency.USD,
      isActive: input.isActive ?? true,
    });
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdatePosProductInput,
  ): Promise<PosProductRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.posProducts();
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Product ${id} not found`);
      }
      const row = await repo.save({
        ...existing,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      });
      return this.toProduct(row);
    }

    this.ensureSeeded(tenantId);
    return this.updateEntity(tenantId, id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
  }

  private toProduct(row: PosProductEntity): PosProductRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      name: row.name,
      price: Number(row.price),
      currency: row.currency as Currency,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private ensureSeeded(tenantId: string): void {
    if (this.scoped(tenantId).length === 0) {
      this.seedProducts(tenantId);
    }
  }

  private seedProducts(tenantId: string): void {
    if (this.scoped(tenantId).length > 0) {
      return;
    }

    const now = new Date();
    for (const item of POS_SALES_CATALOG) {
      this.store.set(item.id, {
        id: item.id,
        tenantId,
        name: item.name,
        price: item.price,
        currency: item.currency,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
