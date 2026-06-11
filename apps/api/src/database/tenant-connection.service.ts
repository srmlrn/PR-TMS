import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { TenantContext } from '@tms/types';
import { TENANT_ENTITIES } from './entities/tenant';

@Injectable()
export class TenantConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionService.name);
  private readonly cache = new Map<string, DataSource>();
  private readonly pending = new Map<string, Promise<DataSource>>();

  private connectionKey(ctx: TenantContext): string {
    return `${ctx.tenantId}:${ctx.environment}`;
  }

  private buildOptions(ctx: TenantContext): DataSourceOptions {
    return {
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.TENANT_DB_USER ?? process.env.DATABASE_USER ?? 'tms',
      password: process.env.TENANT_DB_PASSWORD ?? process.env.DATABASE_PASSWORD ?? 'tms_dev',
      database: ctx.dbName,
      entities: TENANT_ENTITIES,
      synchronize:
        process.env.TENANT_DB_SYNC === 'true' || process.env.NODE_ENV !== 'production',
      logging: process.env.DB_LOGGING === 'true',
    };
  }

  async getDataSource(ctx: TenantContext): Promise<DataSource> {
    const key = this.connectionKey(ctx);
    const existing = this.cache.get(key);
    if (existing?.isInitialized) {
      return existing;
    }

    const inflight = this.pending.get(key);
    if (inflight) {
      return inflight;
    }

    const promise = this.initialize(ctx, key);
    this.pending.set(key, promise);
    try {
      return await promise;
    } finally {
      this.pending.delete(key);
    }
  }

  private async initialize(ctx: TenantContext, key: string): Promise<DataSource> {
    const ds = new DataSource(this.buildOptions(ctx));
    await ds.initialize();
    this.cache.set(key, ds);
    this.logger.log(`Connected tenant-env DB: ${ctx.dbName} (${key})`);
    return ds;
  }

  async onModuleDestroy(): Promise<void> {
    for (const [key, ds] of this.cache) {
      if (ds.isInitialized) {
        await ds.destroy();
        this.logger.log(`Closed connection: ${key}`);
      }
    }
    this.cache.clear();
  }
}
