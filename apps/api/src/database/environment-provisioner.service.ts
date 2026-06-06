import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantEnvironment } from '@tms/types';
import { TenantEnvironmentEntity } from './entities/control/tenant-environment.entity';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantSeedService } from './tenant-seed.service';

@Injectable()
export class EnvironmentProvisionerService {
  private readonly logger = new Logger(EnvironmentProvisionerService.name);

  constructor(
    @InjectDataSource() private readonly controlPlane: DataSource,
    private readonly tenantConnections: TenantConnectionService,
    private readonly tenantResolver: TenantResolverService,
    private readonly tenantSeed: TenantSeedService,
  ) {}

  buildDbName(tenantSlug: string, env: TenantEnvironment): string {
    const slug = tenantSlug.replace(/-/g, '_');
    return `tms_${slug}_${env}`;
  }

  async databaseExists(dbName: string): Promise<boolean> {
    const rows = await this.controlPlane.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );
    return rows.length > 0;
  }

  async createDatabase(dbName: string): Promise<void> {
    const exists = await this.databaseExists(dbName);
    if (exists) {
      this.logger.debug(`Database already exists: ${dbName}`);
      return;
    }
    // Cannot use parameterized identifier for CREATE DATABASE
    const safeName = dbName.replace(/[^a-zA-Z0-9_]/g, '');
    await this.controlPlane.query(`CREATE DATABASE "${safeName}"`);
    this.logger.log(`Created database: ${safeName}`);
  }

  async provisionEnvironment(envRecord: TenantEnvironmentEntity): Promise<void> {
    await this.controlPlane
      .getRepository(TenantEnvironmentEntity)
      .update(envRecord.id, { status: 'provisioning' });

    try {
      await this.createDatabase(envRecord.dbName);
      const ctx = await this.tenantResolver.resolveByEnvironmentId(envRecord.id);
      await this.tenantConnections.getDataSource(ctx);
      await this.tenantSeed.seedIfEmpty(ctx);

      await this.controlPlane.getRepository(TenantEnvironmentEntity).update(envRecord.id, {
        status: 'active',
        provisionedAt: new Date(),
      });
      this.logger.log(`Provisioned environment: ${envRecord.dbName}`);
    } catch (err) {
      await this.controlPlane
        .getRepository(TenantEnvironmentEntity)
        .update(envRecord.id, { status: 'pending' });
      throw err;
    }
  }

  async provisionAllPending(): Promise<number> {
    const pending = await this.controlPlane.getRepository(TenantEnvironmentEntity).find({
      where: [{ status: 'pending' }, { status: 'provisioning' }],
    });

    let count = 0;
    for (const env of pending) {
      await this.provisionEnvironment(env);
      count++;
    }
    return count;
  }

  async ensureActiveEnvironmentsProvisioned(): Promise<void> {
    const active = await this.controlPlane.getRepository(TenantEnvironmentEntity).find({
      where: { status: 'active' },
    });

    for (const env of active) {
      if (!(await this.databaseExists(env.dbName))) {
        await this.provisionEnvironment(env);
      } else {
        const ctx = await this.tenantResolver.resolveByEnvironmentId(env.id);
        await this.tenantConnections.getDataSource(ctx);
        await this.tenantSeed.seedIfEmpty(ctx);
      }
    }
  }
}
