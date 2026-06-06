import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  Currency,
  RentalAsset,
  RentalOrder,
  RentalStatus,
  ReturnInspection,
} from '@tms/types';
import { v4 as uuidv4 } from 'uuid';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { RentalAssetEntity } from '../../database/entities/tenant/rental-asset.entity';
import { RentalOrderEntity } from '../../database/entities/tenant/rental-order.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { CreateRentalOrderDto } from './dto/create-rental-order.dto';
import { ReturnInspectionDto } from './dto/return-inspection.dto';

type RentalAssetRecord = RentalAsset & TenantEntity;
type RentalOrderRecord = RentalOrder & TenantEntity;

interface DamageInvoiceLine {
  description: string;
  amount: number;
}

export interface ReturnInspectionResult {
  inspection: ReturnInspection;
  invoice: {
    lines: DamageInvoiceLine[];
    totalCharges: number;
    depositHeld: number;
    refundAmount: number;
  };
  order: RentalOrderRecord;
}

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';
const LATE_FEE_PER_DAY = 5;

@Injectable()
export class RentalService
  extends BaseTenantService<RentalOrderRecord>
  implements OnModuleInit
{
  protected store = new Map<string, RentalOrderRecord>();
  private assetStore = new Map<string, RentalAssetRecord>();
  private inspectionStore = new Map<string, ReturnInspection>();

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedDemoAssets();
    }
  }

  async getAssets(tenantId: string): Promise<RentalAssetRecord[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.rentalAssets();
      const rows = await repo.find();
      return rows.map((r) => this.toRentalAsset(r));
    }
    return this.assetStoreValues(tenantId);
  }

  async getOrders(tenantId: string, page = 1, limit = 20) {
    if (this.usePostgres) {
      const repo = await this.tenantData.rentalOrders();
      const [rows, total] = await repo.findAndCount({
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        data: rows.map((r) => this.toRentalOrder(r)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    const items = this.scoped(tenantId).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return this.paginate(items, page, limit);
  }

  async findOrder(tenantId: string, id: string): Promise<RentalOrderRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.rentalOrders();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Rental order ${id} not found`);
      }
      return this.toRentalOrder(row);
    }

    const order = this.findOneScoped(tenantId, id);
    if (!order) {
      throw new NotFoundException(`Rental order ${id} not found`);
    }
    return order;
  }

  async createOrder(tenantId: string, dto: CreateRentalOrderDto): Promise<RentalOrderRecord> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const currency = dto.currency ?? Currency.USD;
    let balanceAmount = 0;

    for (const line of dto.assetIds) {
      const asset = await this.findAsset(tenantId, line.assetId);
      if (asset.availableQuantity < line.quantity) {
        throw new BadRequestException(
          `Insufficient availability for ${asset.name}: requested ${line.quantity}, available ${asset.availableQuantity}`,
        );
      }
      const days = this.rentalDays(startDate, endDate);
      balanceAmount += asset.ratePerDay * line.quantity * days;
    }

    if (this.usePostgres) {
      const orderRepo = await this.tenantData.rentalOrders();
      const entity = orderRepo.create({
        clientName: dto.clientName,
        eventId: dto.eventId,
        assetLines: dto.assetIds,
        startDate: dto.startDate,
        endDate: dto.endDate,
        depositAmount: dto.depositAmount,
        balanceAmount,
        currency,
        status: RentalStatus.CONFIRMED,
      });
      const saved = await orderRepo.save(entity);

      const assetRepo = await this.tenantData.rentalAssets();
      for (const line of dto.assetIds) {
        const row = await assetRepo.findOneOrFail({ where: { id: line.assetId } });
        row.availableQuantity -= line.quantity;
        if (row.availableQuantity === 0) {
          row.status = 'out';
        }
        await assetRepo.save(row);
      }

      return this.toRentalOrder(saved);
    }

    const order = this.createEntity(tenantId, {
      clientName: dto.clientName,
      eventId: dto.eventId,
      assetIds: dto.assetIds,
      startDate,
      endDate,
      depositAmount: dto.depositAmount,
      balanceAmount,
      currency,
      status: RentalStatus.CONFIRMED,
    });

    for (const line of dto.assetIds) {
      const asset = this.findAssetSync(tenantId, line.assetId);
      asset.availableQuantity -= line.quantity;
      if (asset.availableQuantity === 0) {
        asset.status = 'out';
      }
      this.assetStore.set(asset.id, { ...asset, updatedAt: new Date() });
    }

    return order;
  }

  async processReturnInspection(
    tenantId: string,
    orderId: string,
    dto: ReturnInspectionDto,
  ): Promise<ReturnInspectionResult> {
    const order = await this.findOrder(tenantId, orderId);
    if (order.status === RentalStatus.RETURNED) {
      throw new BadRequestException('Order has already been returned');
    }

    const totalRented = order.assetIds.reduce((sum, line) => sum + line.quantity, 0);
    const accounted =
      dto.returnedQuantity + dto.damagedQuantity + dto.missingQuantity;

    if (accounted !== totalRented) {
      throw new BadRequestException(
        `Returned + damaged + missing (${accounted}) must equal rented quantity (${totalRented})`,
      );
    }

    const lines: DamageInvoiceLine[] = [];
    let totalCharges = 0;
    const primaryAsset = await this.findAsset(tenantId, order.assetIds[0]?.assetId ?? '');
    const rates = this.damageRates(primaryAsset.category);

    if (dto.missingQuantity > 0) {
      const amount = dto.missingQuantity * rates.missing;
      lines.push({
        description: `Missing ${primaryAsset.name} (×${dto.missingQuantity})`,
        amount,
      });
      totalCharges += amount;
    }

    if (dto.damagedQuantity > 0) {
      const amount = dto.damagedQuantity * rates.damaged;
      lines.push({
        description: `Damaged ${primaryAsset.name} (×${dto.damagedQuantity})`,
        amount,
      });
      totalCharges += amount;
    }

    const overdueDays = this.overdueDays(order.endDate);
    if (overdueDays > 0) {
      const amount = overdueDays * LATE_FEE_PER_DAY;
      lines.push({
        description: `Late return fee (${overdueDays} day${overdueDays > 1 ? 's' : ''})`,
        amount,
      });
      totalCharges += amount;
    }

    const refundAmount = Math.max(0, order.depositAmount - totalCharges);

    const inspection: ReturnInspection = {
      id: uuidv4(),
      tenantId,
      rentalOrderId: orderId,
      returnedQuantity: dto.returnedQuantity,
      damagedQuantity: dto.damagedQuantity,
      missingQuantity: dto.missingQuantity,
      damageCharge: totalCharges,
      refundAmount,
    };
    this.inspectionStore.set(inspection.id, inspection);

    if (this.usePostgres) {
      const assetRepo = await this.tenantData.rentalAssets();
      for (const line of order.assetIds) {
        const row = await assetRepo.findOneOrFail({ where: { id: line.assetId } });
        const restored = dto.returnedQuantity + dto.damagedQuantity;
        row.availableQuantity = Math.min(row.quantity, row.availableQuantity + restored);
        row.status = row.availableQuantity > 0 ? 'available' : 'out';
        await assetRepo.save(row);
      }

      const orderRepo = await this.tenantData.rentalOrders();
      await orderRepo.update(orderId, {
        status: RentalStatus.RETURNED,
        balanceAmount: Math.max(0, order.balanceAmount + totalCharges - order.depositAmount),
      });
      const updated = await orderRepo.findOneOrFail({ where: { id: orderId } });

      return {
        inspection,
        invoice: {
          lines,
          totalCharges,
          depositHeld: order.depositAmount,
          refundAmount,
        },
        order: this.toRentalOrder(updated),
      };
    }

    for (const line of order.assetIds) {
      const asset = this.findAssetSync(tenantId, line.assetId);
      const restored = dto.returnedQuantity + dto.damagedQuantity;
      asset.availableQuantity = Math.min(asset.quantity, asset.availableQuantity + restored);
      asset.status = asset.availableQuantity > 0 ? 'available' : 'out';
      this.assetStore.set(asset.id, { ...asset, updatedAt: new Date() });
    }

    const updatedOrder = this.updateEntity(tenantId, orderId, {
      status: RentalStatus.RETURNED,
      balanceAmount: Math.max(0, order.balanceAmount + totalCharges - order.depositAmount),
    });

    return {
      inspection,
      invoice: {
        lines,
        totalCharges,
        depositHeld: order.depositAmount,
        refundAmount,
      },
      order: updatedOrder,
    };
  }

  private async findAsset(tenantId: string, id: string): Promise<RentalAssetRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.rentalAssets();
      const row = await repo.findOne({ where: { id } });
      if (!row) {
        throw new NotFoundException(`Rental asset ${id} not found`);
      }
      return this.toRentalAsset(row);
    }
    return this.findAssetSync(tenantId, id);
  }

  private findAssetSync(tenantId: string, id: string): RentalAssetRecord {
    const asset = this.assetStore.get(id);
    if (!asset || asset.tenantId !== tenantId) {
      throw new NotFoundException(`Rental asset ${id} not found`);
    }
    return asset;
  }

  private toRentalAsset(row: RentalAssetEntity): RentalAssetRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      name: row.name,
      category: row.category as RentalAsset['category'],
      quantity: row.quantity,
      availableQuantity: row.availableQuantity,
      ratePerDay: Number(row.ratePerDay),
      currency: row.currency as Currency,
      conditionGrade: row.conditionGrade as RentalAsset['conditionGrade'],
      status: row.status as RentalAsset['status'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toRentalOrder(row: RentalOrderEntity): RentalOrderRecord {
    return {
      id: row.id,
      tenantId: TenantContextStorage.get().tenantId,
      clientName: row.clientName,
      eventId: row.eventId,
      assetIds: row.assetLines,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      depositAmount: Number(row.depositAmount),
      balanceAmount: Number(row.balanceAmount),
      currency: row.currency as Currency,
      status: row.status as RentalStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private assetStoreValues(tenantId: string): RentalAssetRecord[] {
    return [...this.assetStore.values()].filter((a) => a.tenantId === tenantId);
  }

  private rentalDays(start: Date, end: Date): number {
    const ms = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
  }

  private overdueDays(endDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(endDate);
    due.setHours(0, 0, 0, 0);
    const diff = today.getTime() - due.getTime();
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
  }

  private damageRates(category: RentalAsset['category']): { missing: number; damaged: number } {
    switch (category) {
      case 'furniture':
        return { missing: 45, damaged: 20 };
      case 'av':
        return { missing: 200, damaged: 75 };
      case 'kitchen':
        return { missing: 150, damaged: 60 };
      case 'decor':
        return { missing: 80, damaged: 35 };
      case 'tent':
        return { missing: 300, damaged: 120 };
      default:
        return { missing: 50, damaged: 25 };
    }
  }

  private seedDemoAssets(): void {
    if (this.assetStoreValues(DEMO_TENANT).length > 0) {
      return;
    }

    const assets: Omit<RentalAssetRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'PA System (Full)',
        category: 'av',
        quantity: 4,
        availableQuantity: 2,
        ratePerDay: 200,
        currency: Currency.USD,
        conditionGrade: 'A',
        status: 'available',
      },
      {
        name: 'Banquet Chairs',
        category: 'furniture',
        quantity: 500,
        availableQuantity: 320,
        ratePerDay: 2,
        currency: Currency.USD,
        conditionGrade: 'B',
        status: 'available',
      },
      {
        name: 'Projector + Screen',
        category: 'av',
        quantity: 3,
        availableQuantity: 1,
        ratePerDay: 75,
        currency: Currency.USD,
        conditionGrade: 'A',
        status: 'available',
      },
    ];

    for (const asset of assets) {
      const entity = this.createAssetEntity(DEMO_TENANT, asset);
      this.assetStore.set(entity.id, entity);
    }
  }

  private createAssetEntity(
    tenantId: string,
    data: Omit<RentalAssetRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): RentalAssetRecord {
    const now = new Date();
    const entity: RentalAssetRecord = {
      ...data,
      id: uuidv4(),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    return entity;
  }
}
