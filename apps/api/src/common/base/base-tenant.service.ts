import { v4 as uuidv4 } from 'uuid';

export interface TenantEntity {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class BaseTenantService<T extends TenantEntity> {
  protected abstract store: Map<string, T>;

  protected scoped(tenantId: string): T[] {
    return [...this.store.values()].filter((e) => e.tenantId === tenantId);
  }

  protected findOneScoped(tenantId: string, id: string): T | undefined {
    const entity = this.store.get(id);
    return entity?.tenantId === tenantId ? entity : undefined;
  }

  protected createEntity(
    tenantId: string,
    data: Omit<T, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): T {
    const now = new Date();
    const entity = {
      ...data,
      id: uuidv4(),
      tenantId,
      createdAt: now,
      updatedAt: now,
    } as T;
    this.store.set(entity.id, entity);
    return entity;
  }

  protected updateEntity(tenantId: string, id: string, data: Partial<T>): T {
    const existing = this.findOneScoped(tenantId, id);
    if (!existing) {
      throw new Error(`Entity ${id} not found for tenant ${tenantId}`);
    }
    const updated = { ...existing, ...data, updatedAt: new Date() } as T;
    this.store.set(id, updated);
    return updated;
  }

  protected paginate<E>(items: E[], page = 1, limit = 20) {
    const total = items.length;
    const start = (page - 1) * limit;
    return {
      data: items.slice(start, start + limit),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
