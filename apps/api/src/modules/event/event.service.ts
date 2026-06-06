import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  EventChecklistItem,
  EventLifecycleStage,
  TempleEvent,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { EventChecklistEntity } from '../../database/entities/tenant/event-checklist.entity';
import { TempleEventEntity } from '../../database/entities/tenant/temple-event.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

type EventEntity = TempleEvent & TenantEntity;

export interface EventBudgetSnapshot {
  eventId: string;
  plannedBudget: number;
  revenueTarget: number;
  income: {
    donations: number;
    bookings: number;
    sponsorships: number;
    total: number;
  };
  expenses: {
    catering: number;
    avEquipment: number;
    decoration: number;
    total: number;
  };
  netSurplus: number;
}

const STAGE_ORDER: EventLifecycleStage[] = [
  EventLifecycleStage.ENQUIRY,
  EventLifecycleStage.QUOTATION,
  EventLifecycleStage.CONFIRMED,
  EventLifecycleStage.IN_PROGRESS,
  EventLifecycleStage.COMPLETED,
];

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class EventService
  extends BaseTenantService<EventEntity>
  implements OnModuleInit
{
  protected store = new Map<string, EventEntity>();
  private checklistStore = new Map<string, EventChecklistItem>();

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedDemoData();
    }
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    stage?: EventLifecycleStage,
  ) {
    if (this.usePostgres) {
      const repo = await this.tenantData.events();
      const qb = repo.createQueryBuilder('e');
      if (stage) {
        qb.andWhere('e.stage = :stage', { stage });
      }
      qb.orderBy('e.startDate', 'DESC');
      const total = await qb.getCount();
      const rows = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
      return {
        data: rows.map((r) => this.toEvent(r)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    let items = this.scoped(tenantId);
    if (stage) {
      items = items.filter((e) => e.stage === stage);
    }
    items.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    return this.paginate(items, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<EventEntity> {
    if (this.usePostgres) {
      const repo = await this.tenantData.events();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Event ${id} not found`);
      }
      return this.toEvent(row);
    }

    const event = this.findOneScoped(tenantId, id);
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    return event;
  }

  async create(tenantId: string, dto: CreateEventDto): Promise<EventEntity> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    if (this.usePostgres) {
      const repo = await this.tenantData.events();
      const entity = repo.create({
        name: dto.name,
        type: dto.type,
        stage: EventLifecycleStage.ENQUIRY,
        startDate,
        endDate,
        venues: dto.venues,
        expectedFootfall: dto.expectedFootfall,
        budgetPlanned: dto.budgetPlanned,
        revenueTarget: dto.revenueTarget,
        clientName: dto.clientName,
        clientContact: dto.clientContact,
        volunteerCategory: dto.volunteerCategory ?? null,
        volunteersNeeded: dto.volunteersNeeded ?? null,
        volunteerRoles: dto.volunteerRoles ?? null,
        checklistProgress: { done: 0, total: 0 },
      });
      const saved = await repo.save(entity);
      return this.toEvent(saved);
    }

    return this.createEntity(tenantId, {
      name: dto.name,
      type: dto.type,
      stage: EventLifecycleStage.ENQUIRY,
      startDate,
      endDate,
      venues: dto.venues,
      expectedFootfall: dto.expectedFootfall,
      budgetPlanned: dto.budgetPlanned,
      revenueTarget: dto.revenueTarget,
      clientName: dto.clientName,
      clientContact: dto.clientContact,
      volunteerCategory: dto.volunteerCategory,
      volunteersNeeded: dto.volunteersNeeded,
      volunteerRoles: dto.volunteerRoles,
      checklistProgress: { done: 0, total: 0 },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEventDto): Promise<EventEntity> {
    await this.findOne(tenantId, id);

    if (this.usePostgres) {
      const repo = await this.tenantData.events();
      await repo.update(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.venues !== undefined && { venues: dto.venues }),
        ...(dto.expectedFootfall !== undefined && { expectedFootfall: dto.expectedFootfall }),
        ...(dto.budgetPlanned !== undefined && { budgetPlanned: dto.budgetPlanned }),
        ...(dto.revenueTarget !== undefined && { revenueTarget: dto.revenueTarget }),
        ...(dto.clientName !== undefined && { clientName: dto.clientName }),
        ...(dto.clientContact !== undefined && { clientContact: dto.clientContact }),
        ...(dto.volunteerCategory !== undefined && { volunteerCategory: dto.volunteerCategory }),
        ...(dto.volunteersNeeded !== undefined && { volunteersNeeded: dto.volunteersNeeded }),
        ...(dto.volunteerRoles !== undefined && { volunteerRoles: dto.volunteerRoles }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      });
      const updated = await repo.findOneOrFail({ where: { id } });
      return this.toEvent(updated);
    }

    const patch: Partial<EventEntity> = {};

    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.venues !== undefined) patch.venues = dto.venues;
    if (dto.expectedFootfall !== undefined) patch.expectedFootfall = dto.expectedFootfall;
    if (dto.budgetPlanned !== undefined) patch.budgetPlanned = dto.budgetPlanned;
    if (dto.revenueTarget !== undefined) patch.revenueTarget = dto.revenueTarget;
    if (dto.clientName !== undefined) patch.clientName = dto.clientName;
    if (dto.clientContact !== undefined) patch.clientContact = dto.clientContact;
    if (dto.volunteerCategory !== undefined) patch.volunteerCategory = dto.volunteerCategory;
    if (dto.volunteersNeeded !== undefined) patch.volunteersNeeded = dto.volunteersNeeded;
    if (dto.volunteerRoles !== undefined) patch.volunteerRoles = dto.volunteerRoles;

    if (dto.startDate !== undefined) patch.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) patch.endDate = new Date(dto.endDate);

    return this.updateEntity(tenantId, id, patch);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);

    if (this.usePostgres) {
      const checklistRepo = await this.tenantData.eventChecklist();
      await checklistRepo.delete({ eventId: id });
      const repo = await this.tenantData.events();
      await repo.delete(id);
      return;
    }

    this.store.delete(id);
    for (const [key, item] of this.checklistStore) {
      if (item.eventId === id && item.tenantId === tenantId) {
        this.checklistStore.delete(key);
      }
    }
  }

  async updateStage(
    tenantId: string,
    id: string,
    stage: EventLifecycleStage,
  ): Promise<EventEntity> {
    const event = await this.findOne(tenantId, id);
    if (stage === EventLifecycleStage.CANCELLED) {
      if (this.usePostgres) {
        const repo = await this.tenantData.events();
        await repo.update(id, { stage });
        const updated = await repo.findOneOrFail({ where: { id } });
        return this.toEvent(updated);
      }
      return this.updateEntity(tenantId, id, { stage });
    }

    const currentIndex = STAGE_ORDER.indexOf(event.stage);
    const targetIndex = STAGE_ORDER.indexOf(stage);

    if (currentIndex === -1 || targetIndex === -1) {
      throw new BadRequestException(`Invalid stage transition from ${event.stage} to ${stage}`);
    }
    if (targetIndex < currentIndex) {
      throw new BadRequestException(`Cannot move event backwards from ${event.stage} to ${stage}`);
    }

    if (this.usePostgres) {
      const repo = await this.tenantData.events();
      await repo.update(id, { stage });
      const updated = await repo.findOneOrFail({ where: { id } });
      return this.toEvent(updated);
    }

    return this.updateEntity(tenantId, id, { stage });
  }

  async getChecklist(tenantId: string, eventId: string): Promise<EventChecklistItem[]> {
    await this.findOne(tenantId, eventId);

    if (this.usePostgres) {
      const repo = await this.tenantData.eventChecklist();
      const rows = await repo.find({ where: { eventId } });
      return rows.map((r) => this.toChecklistItem(r));
    }

    return [...this.checklistStore.values()].filter(
      (item) => item.tenantId === tenantId && item.eventId === eventId,
    );
  }

  async toggleChecklistItem(
    tenantId: string,
    eventId: string,
    itemId: string,
    isDone: boolean,
  ): Promise<EventChecklistItem> {
    await this.findOne(tenantId, eventId);

    if (this.usePostgres) {
      const repo = await this.tenantData.eventChecklist();
      const row = await repo.findOne({ where: { id: itemId, eventId } });
      if (!row) {
        throw new NotFoundException(`Checklist item ${itemId} not found`);
      }
      row.isDone = isDone;
      const saved = await repo.save(row);
      await this.syncChecklistProgress(tenantId, eventId);
      return this.toChecklistItem(saved);
    }

    const item = this.checklistStore.get(itemId);
    if (!item || item.tenantId !== tenantId || item.eventId !== eventId) {
      throw new NotFoundException(`Checklist item ${itemId} not found`);
    }
    item.isDone = isDone;
    this.checklistStore.set(itemId, item);
    await this.syncChecklistProgress(tenantId, eventId);
    return item;
  }

  private async syncChecklistProgress(tenantId: string, eventId: string): Promise<void> {
    const items = await this.getChecklist(tenantId, eventId);
    const done = items.filter((i) => i.isDone).length;
    const progress = { done, total: items.length };

    if (this.usePostgres) {
      const repo = await this.tenantData.events();
      await repo.update(eventId, { checklistProgress: progress });
      return;
    }

    const event = this.findOneScoped(tenantId, eventId);
    if (event) {
      event.checklistProgress = progress;
      this.store.set(eventId, event);
    }
  }

  async getBudget(tenantId: string, eventId: string): Promise<EventBudgetSnapshot> {
    const event = await this.findOne(tenantId, eventId);
    const plannedBudget = event.budgetPlanned ?? 0;
    const revenueTarget = event.revenueTarget ?? 0;

    const income = {
      donations: 48_000,
      bookings: 22_000,
      sponsorships: 18_000,
      total: 88_000,
    };
    const expenses = {
      catering: 14_000,
      avEquipment: 3_200,
      decoration: 5_600,
      total: 22_800,
    };

    return {
      eventId,
      plannedBudget,
      revenueTarget,
      income,
      expenses,
      netSurplus: income.total - expenses.total,
    };
  }

  async getPipeline(tenantId: string): Promise<Record<EventLifecycleStage, EventEntity[]>> {
    if (this.usePostgres) {
      const repo = await this.tenantData.events();
      const rows = await repo.find();
      const events = rows.map((r) => this.toEvent(r));
      const pipeline = {} as Record<EventLifecycleStage, EventEntity[]>;
      for (const stage of STAGE_ORDER) {
        pipeline[stage] = events.filter((e) => e.stage === stage);
      }
      return pipeline;
    }

    const pipeline = {} as Record<EventLifecycleStage, EventEntity[]>;
    for (const stage of STAGE_ORDER) {
      pipeline[stage] = this.scoped(tenantId).filter((e) => e.stage === stage);
    }
    return pipeline;
  }

  private toEvent(row: TempleEventEntity): EventEntity {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      name: row.name,
      type: row.type as TempleEvent['type'],
      stage: row.stage as EventLifecycleStage,
      startDate: row.startDate,
      endDate: row.endDate,
      venues: row.venues,
      expectedFootfall: row.expectedFootfall,
      budgetPlanned: row.budgetPlanned != null ? Number(row.budgetPlanned) : undefined,
      revenueTarget: row.revenueTarget != null ? Number(row.revenueTarget) : undefined,
      clientName: row.clientName,
      clientContact: row.clientContact,
      checklistProgress: row.checklistProgress,
      volunteerCategory: row.volunteerCategory as TempleEvent['volunteerCategory'],
      volunteersNeeded: row.volunteersNeeded ?? undefined,
      volunteerRoles: row.volunteerRoles as TempleEvent['volunteerRoles'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toChecklistItem(row: EventChecklistEntity): EventChecklistItem {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      eventId: row.eventId,
      title: row.title,
      department: row.department,
      isDone: row.isDone,
      assignedTo: row.assignedTo,
    };
  }

  private seedEntityWithId(
    tenantId: string,
    id: string,
    data: Omit<EventEntity, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): EventEntity {
    const now = new Date();
    const entity = { ...data, id, tenantId, createdAt: now, updatedAt: now };
    this.store.set(id, entity);
    return entity;
  }

  private seedDemoData(): void {
    if (this.scoped(DEMO_TENANT).length > 0) {
      return;
    }

    const brahmotsavam = this.seedEntityWithId(DEMO_TENANT, 'evt-brahmotsavam-2026', {
      name: 'Brahmotsavam 2026',
      type: 'festival',
      stage: EventLifecycleStage.CONFIRMED,
      startDate: new Date('2026-06-08'),
      endDate: new Date('2026-06-15'),
      venues: ['Main Hall', 'Kalyana Mandapam', 'Open Ground'],
      expectedFootfall: 4200,
      budgetPlanned: 82_000,
      revenueTarget: 95_000,
      volunteerCategory: 'festival',
      volunteersNeeded: 36,
      volunteerRoles: [
        { role: 'setup', slotsNeeded: 10, description: 'Festival setup' },
        { role: 'kitchen', slotsNeeded: 8, description: 'Annadanam service' },
        { role: 'parking', slotsNeeded: 8, description: 'Parking & queue' },
      ],
      checklistProgress: { done: 3, total: 6 },
    });

    this.seedEntityWithId(DEMO_TENANT, 'evt-navaratri-2026', {
      name: 'Navaratri 2026',
      type: 'festival',
      stage: EventLifecycleStage.CONFIRMED,
      startDate: new Date('2026-09-20'),
      endDate: new Date('2026-09-28'),
      venues: ['Main Hall', 'Open Ground'],
      expectedFootfall: 2500,
      volunteerCategory: 'setup',
      volunteersNeeded: 14,
      checklistProgress: { done: 1, total: 4 },
    });

    this.seedEntityWithId(DEMO_TENANT, 'evt-sunday-annadanam', {
      name: 'Sunday Annadanam',
      type: 'community',
      stage: EventLifecycleStage.IN_PROGRESS,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      venues: ['Community Kitchen', 'Dining Hall'],
      volunteerCategory: 'annadanam',
      volunteersNeeded: 14,
      checklistProgress: { done: 2, total: 2 },
    });

    const checklistItems: Omit<EventChecklistItem, 'id' | 'tenantId'>[] = [
      { eventId: brahmotsavam.id, title: 'Volunteer roster', department: 'Volunteers', isDone: true },
      { eventId: brahmotsavam.id, title: 'Live stream setup', department: 'A/V', isDone: true },
      { eventId: brahmotsavam.id, title: 'Priest schedule', department: 'Religious', isDone: true },
      { eventId: brahmotsavam.id, title: 'Vendor contracts', department: 'Procurement', isDone: false },
      { eventId: brahmotsavam.id, title: 'Prasadam prep orders', department: 'Kitchen', isDone: false },
      { eventId: brahmotsavam.id, title: 'Post-event report', department: 'Admin', isDone: false },
    ];

    for (const item of checklistItems) {
      const entity: EventChecklistItem = { id: uuidv4(), tenantId: DEMO_TENANT, ...item };
      this.checklistStore.set(entity.id, entity);
    }
  }
}
