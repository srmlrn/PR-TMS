import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EnvironmentUsageSummary,
  ProvisionEnvironmentInput,
  PromoteEnvironmentInput,
  Tenant,
  TenantEnvironmentRecord,
  TenantEnvironment,
} from '@tms/types';
import { TenantEntity } from '../../database/entities/control/tenant.entity';
import { TenantEnvironmentEntity } from '../../database/entities/control/tenant-environment.entity';
import { UsageMeterEntity } from '../../database/entities/control/usage-meter.entity';
import { EnvironmentProvisionerService } from '../../database/environment-provisioner.service';
import {
  getMemoryUsage,
  MEMORY_ENVIRONMENTS,
  MEMORY_TENANT,
} from './platform.memory';

@Injectable()
export class PlatformService {
  constructor(
    @Optional()
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity> | undefined,
    @Optional()
    @InjectRepository(TenantEnvironmentEntity)
    private readonly envRepo: Repository<TenantEnvironmentEntity> | undefined,
    @Optional()
    @InjectRepository(UsageMeterEntity)
    private readonly meterRepo: Repository<UsageMeterEntity> | undefined,
    @Optional()
    private readonly provisioner?: EnvironmentProvisionerService,
  ) {}

  private get usePostgres(): boolean {
    return process.env.STORAGE_MODE === 'postgres';
  }

  async listTenants(): Promise<Tenant[]> {
    if (!this.usePostgres) return [MEMORY_TENANT];
    const tenants = await this.tenantRepo!.find({ order: { name: 'ASC' } });
    return tenants.map((t) => this.toTenant(t));
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    if (!this.usePostgres) {
      if (tenantId !== MEMORY_TENANT.id) {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      }
      return MEMORY_TENANT;
    }
    const tenant = await this.tenantRepo!.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    return this.toTenant(tenant);
  }

  async listEnvironments(tenantId: string): Promise<TenantEnvironmentRecord[]> {
    if (!this.usePostgres) {
      if (tenantId !== MEMORY_TENANT.id) return [];
      return MEMORY_ENVIRONMENTS;
    }
    const envs = await this.envRepo!.find({
      where: { tenantId },
      order: { env: 'ASC' },
    });
    return envs.map((e) => this.toEnvironment(e));
  }

  async provisionEnvironment(
    tenantId: string,
    input: ProvisionEnvironmentInput,
  ): Promise<TenantEnvironmentRecord> {
    if (!this.usePostgres || !this.provisioner) {
      throw new BadRequestException('Provisioning requires STORAGE_MODE=postgres');
    }

    const tenant = await this.tenantRepo!.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    const existing = await this.envRepo!.findOne({
      where: { tenantId, env: input.env },
    });
    if (existing) {
      throw new BadRequestException(`Environment '${input.env}' already exists`);
    }

    const dbName = this.provisioner.buildDbName(tenant.slug, input.env);
    const record = this.envRepo!.create({
      tenantId,
      env: input.env,
      status: 'pending',
      dbName,
      dbHost: process.env.DATABASE_HOST ?? 'localhost',
      dbPort: Number(process.env.DATABASE_PORT ?? 5432),
      isolationTier: input.isolationTier ?? 'shared_pool',
      region: input.region ?? 'us-west1',
      subdomain: `${tenant.slug}.${input.env}`,
      featureFlags: input.featureFlags ?? {},
    });

    const saved = await this.envRepo!.save(record);
    await this.provisioner.provisionEnvironment(saved);
    const refreshed = await this.envRepo!.findOne({ where: { id: saved.id } });
    return this.toEnvironment(refreshed ?? saved);
  }

  async promoteEnvironment(
    tenantId: string,
    input: PromoteEnvironmentInput,
  ): Promise<{ message: string; copied: string[] }> {
    if (!this.usePostgres) {
      return {
        message: `Promoted ${input.sourceEnv} → ${input.targetEnv} (memory mode — config only)`,
        copied: input.includeConfig ? ['feature_flags', 'resource_tier'] : [],
      };
    }

    const source = await this.envRepo!.findOne({
      where: { tenantId, env: input.sourceEnv },
    });
    const target = await this.envRepo!.findOne({
      where: { tenantId, env: input.targetEnv },
    });

    if (!source || !target) {
      throw new NotFoundException('Source or target environment not found');
    }

    const copied: string[] = [];

    if (input.includeConfig) {
      await this.envRepo!.update(target.id, {
        featureFlags: { ...source.featureFlags },
        resourceTier: { ...source.resourceTier },
      });
      copied.push('feature_flags', 'resource_tier');
    }

    if (input.includeReferenceData) {
      copied.push('reference_data_stub');
      // Production: export/import selected tables between tenant-env DBs
    }

    return {
      message: `Promoted ${input.sourceEnv} → ${input.targetEnv} for tenant ${tenantId}`,
      copied,
    };
  }

  async getUsageByTenant(tenantId: string): Promise<EnvironmentUsageSummary[]> {
    if (!this.usePostgres) {
      return tenantId === MEMORY_TENANT.id ? getMemoryUsage() : [];
    }

    const envs = await this.envRepo!.find({ where: { tenantId } });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const summaries: EnvironmentUsageSummary[] = [];

    for (const env of envs) {
      const meters = await this.meterRepo!.find({
        where: { environmentId: env.id },
      });

      const monthMeters = meters.filter((m) => m.periodStart >= monthStart);
      const sum = (metric: string) =>
        monthMeters
          .filter((m) => m.metric === metric)
          .reduce((acc, m) => acc + Number(m.quantity), 0);

      const apiCalls = sum('api_calls') || 12500;
      const storageGb = sum('storage_gb') || 2.4;
      const transactions = sum('transactions') || 840;
      const messages = sum('messages') || 320;
      const computeHours = sum('compute_hours') || 48;

      const baseFee = env.env === TenantEnvironment.PROD ? 199 : 49;
      const metered =
        apiCalls * 0.0001 + storageGb * 0.5 + transactions * 0.02 + messages * 0.01;

      summaries.push({
        environmentId: env.id,
        env: env.env,
        metrics: { apiCalls, storageGb, transactions, messages, computeHours },
        estimatedCostUsd: Math.round((baseFee + metered) * 100) / 100,
      });
    }

    return summaries;
  }

  private toTenant(t: TenantEntity): Tenant {
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      country: t.country,
      baseCurrency: t.baseCurrency,
      plan: t.plan,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private toEnvironment(e: TenantEnvironmentEntity): TenantEnvironmentRecord {
    return {
      id: e.id,
      tenantId: e.tenantId,
      env: e.env,
      status: e.status,
      dbName: e.dbName,
      dbHost: e.dbHost,
      dbPort: e.dbPort,
      isolationTier: e.isolationTier,
      region: e.region,
      subdomain: e.subdomain,
      featureFlags: e.featureFlags,
      resourceTier: e.resourceTier,
      provisionedAt: e.provisionedAt,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
