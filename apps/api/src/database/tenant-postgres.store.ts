import { EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { TenantContextStorage } from '../common/context/tenant-context.storage';
import { TenantConnectionService } from './tenant-connection.service';

export function isPostgresMode(): boolean {
  return process.env.STORAGE_MODE === 'postgres';
}

export abstract class TenantPostgresStore {
  constructor(protected readonly connections: TenantConnectionService) {}

  protected async repo<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Promise<Repository<T>> {
    const ctx = TenantContextStorage.get();
    const ds = await this.connections.getDataSource(ctx);
    return ds.getRepository(entity);
  }

  protected async count(entity: EntityTarget<ObjectLiteral>): Promise<number> {
    const repository = await this.repo(entity);
    return repository.count();
  }
}
