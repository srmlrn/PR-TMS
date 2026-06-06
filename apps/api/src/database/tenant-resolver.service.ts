import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext, TenantEnvironment } from '@tms/types';
import { TenantEntity } from './entities/control/tenant.entity';
import { TenantEnvironmentEntity } from './entities/control/tenant-environment.entity';

@Injectable()
export class TenantResolverService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(TenantEnvironmentEntity)
    private readonly envRepo: Repository<TenantEnvironmentEntity>,
  ) {}

  async resolve(tenantKey: string, environment: TenantEnvironment): Promise<TenantContext> {
    const tenant = await this.findTenant(tenantKey);
    const envRecord = await this.envRepo.findOne({
      where: { tenantId: tenant.id, env: environment },
    });

    if (!envRecord) {
      throw new NotFoundException(
        `Environment '${environment}' not found for tenant '${tenant.slug}'`,
      );
    }

    if (envRecord.status === 'suspended' || envRecord.status === 'decommissioned') {
      throw new ForbiddenException(`Environment '${environment}' is ${envRecord.status}`);
    }

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      environment,
      environmentId: envRecord.id,
      dbName: envRecord.dbName,
    };
  }

  async resolveByEnvironmentId(environmentId: string): Promise<TenantContext> {
    const envRecord = await this.envRepo.findOne({
      where: { id: environmentId },
      relations: ['tenant'],
    });
    if (!envRecord?.tenant) {
      throw new NotFoundException(`Environment ${environmentId} not found`);
    }
    return {
      tenantId: envRecord.tenantId,
      tenantSlug: envRecord.tenant.slug,
      environment: envRecord.env,
      environmentId: envRecord.id,
      dbName: envRecord.dbName,
    };
  }

  private async findTenant(tenantKey: string): Promise<TenantEntity> {
    const isUuid = /^[0-9a-f-]{36}$/i.test(tenantKey);
    const tenant = await this.tenantRepo.findOne({
      where: isUuid ? { id: tenantKey } : { slug: tenantKey },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException(`Tenant '${tenantKey}' not found or inactive`);
    }
    return tenant;
  }
}
