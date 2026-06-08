import {
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  CreateSevaSubscriptionInput,
  GANESHA_TEMPLE_ID,
  SevaSubscription,
  UpdateSevaSubscriptionInput,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { SevaSubscriptionEntity } from '../../database/entities/tenant/seva-subscription.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { DevoteeService } from '../devotee/devotee.service';
import { SevaCatalogService } from './seva-catalog.service';

type SubscriptionRecord = SevaSubscription & TenantEntity;

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class SevaSubscriptionService
  extends BaseTenantService<SubscriptionRecord>
  implements OnModuleInit
{
  protected store = new Map<string, SubscriptionRecord>();

  constructor(
    private readonly tenantData: TenantDataService,
    private readonly devoteeService: DevoteeService,
    private readonly sevaCatalogService: SevaCatalogService,
  ) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedDemoSubscriptions();
    }
  }

  async findAll(
    tenantId: string,
    filters?: { devoteeId?: string; status?: string },
  ): Promise<{ data: SubscriptionRecord[] }> {
    if (this.usePostgres) {
      const repo = await this.tenantData.sevaSubscriptions();
      const qb = repo.createQueryBuilder('s').orderBy('s.nextDate', 'ASC');

      if (filters?.devoteeId) {
        qb.andWhere('s.devoteeId = :devoteeId', { devoteeId: filters.devoteeId });
      }
      if (filters?.status) {
        qb.andWhere('s.status = :status', { status: filters.status });
      }

      const rows = await qb.getMany();
      return { data: rows.map((r) => this.toSubscription(r)) };
    }

    let items = this.scoped(tenantId);
    if (filters?.devoteeId) {
      items = items.filter((s) => s.devoteeId === filters.devoteeId);
    }
    if (filters?.status) {
      items = items.filter((s) => s.status === filters.status);
    }
    items.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
    return { data: items };
  }

  async create(
    tenantId: string,
    input: CreateSevaSubscriptionInput,
  ): Promise<SubscriptionRecord> {
    if (!(await this.devoteeService.exists(tenantId, input.devoteeId))) {
      throw new NotFoundException(`Devotee ${input.devoteeId} not found`);
    }
    await this.sevaCatalogService.findOne(tenantId, input.serviceId);

    const nextDate = new Date(input.nextDate.slice(0, 10));

    if (this.usePostgres) {
      const repo = await this.tenantData.sevaSubscriptions();
      const entity = repo.create({
        devoteeId: input.devoteeId,
        serviceId: input.serviceId,
        frequency: input.frequency,
        status: 'active',
        nextDate,
        sankalpa: input.sankalpa as Record<string, string | number | boolean> | undefined,
      });
      const saved = await repo.save(entity);
      return this.toSubscription(saved);
    }

    return this.createEntity(tenantId, {
      devoteeId: input.devoteeId,
      serviceId: input.serviceId,
      frequency: input.frequency,
      status: 'active',
      nextDate,
      sankalpa: input.sankalpa,
    });
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateSevaSubscriptionInput,
  ): Promise<SubscriptionRecord> {
    const existing = await this.findOne(tenantId, id);

    const patch: Partial<SubscriptionRecord> = {};
    if (input.frequency !== undefined) patch.frequency = input.frequency;
    if (input.status !== undefined) patch.status = input.status;
    if (input.nextDate !== undefined) patch.nextDate = new Date(input.nextDate.slice(0, 10));
    if (input.sankalpa !== undefined) {
      patch.sankalpa = { ...existing.sankalpa, ...input.sankalpa };
    }

    if (this.usePostgres) {
      const repo = await this.tenantData.sevaSubscriptions();
      await repo.update(id, {
        ...(patch.frequency !== undefined && { frequency: patch.frequency }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.nextDate !== undefined && { nextDate: patch.nextDate }),
        ...(patch.sankalpa !== undefined && {
          sankalpa: patch.sankalpa as Record<string, string | number | boolean>,
        }),
      });
      const row = await repo.findOneByOrFail({ id });
      return this.toSubscription(row);
    }

    return this.updateEntity(tenantId, id, patch);
  }

  private async findOne(tenantId: string, id: string): Promise<SubscriptionRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.sevaSubscriptions();
      const row = await repo.findOneBy({ id });
      if (!row) {
        throw new NotFoundException(`Seva subscription ${id} not found`);
      }
      const record = this.toSubscription(row);
      if (record.tenantId !== tenantId) {
        throw new NotFoundException(`Seva subscription ${id} not found`);
      }
      return record;
    }

    const record = this.findOneScoped(tenantId, id);
    if (!record) {
      throw new NotFoundException(`Seva subscription ${id} not found`);
    }
    return record;
  }

  private toSubscription(row: SevaSubscriptionEntity): SubscriptionRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      devoteeId: row.devoteeId,
      serviceId: row.serviceId,
      frequency: row.frequency as SubscriptionRecord['frequency'],
      status: row.status as SubscriptionRecord['status'],
      nextDate: row.nextDate,
      sankalpa: row.sankalpa as SevaSubscription['sankalpa'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private seedDemoSubscriptions(): void {
    const tenantId = GANESHA_TEMPLE_ID ?? DEMO_TENANT;
    if (this.scoped(tenantId).length > 0) return;

    this.createEntity(tenantId, {
      devoteeId: 'dev-rajan-krishnamurthy',
      serviceId: 'svc-archana',
      frequency: 'monthly',
      status: 'active',
      nextDate: new Date('2026-07-07'),
      sankalpa: {
        sponsorName: 'Rajan Krishnamurthy',
        gotram: 'Bharadwaja',
        nakshatra: 'Rohini',
      },
    });
  }
}
