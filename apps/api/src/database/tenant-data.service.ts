import { Injectable, Optional } from '@nestjs/common';
import { TenantContextStorage } from '../common/context/tenant-context.storage';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantSeedService } from './tenant-seed.service';
import { isPostgresMode } from './tenant-postgres.store';
import {
  DevoteeEntity,
  SevaServiceEntity,
  BookingEntity,
  TempleEventEntity,
  EventChecklistEntity,
  RentalAssetEntity,
  RentalOrderEntity,
  SponsorEntity,
  RecognitionItemEntity,
  PrasadamSponsorshipEntity,
  DonationEntity,
  DonationCampaignEntity,
  DonationSubscriptionEntity,
  VendorPaymentEntity,
  QueueTokenEntity,
  StaffEntity,
  VolunteerShiftEntity,
} from './entities/tenant';

@Injectable()
export class TenantDataService {
  constructor(
    @Optional() private readonly connections?: TenantConnectionService,
    @Optional() private readonly seed?: TenantSeedService,
  ) {}

  get enabled(): boolean {
    return isPostgresMode();
  }

  private requireConnections(): TenantConnectionService {
    if (!this.connections) {
      throw new Error('Postgres connections are not available in memory mode');
    }
    return this.connections;
  }

  async ensureSeeded(): Promise<void> {
    if (!this.enabled) return;
    await this.seed?.seedIfEmpty(TenantContextStorage.get());
  }

  async devotees() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(DevoteeEntity);
  }

  async sevaServices() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(SevaServiceEntity);
  }

  async bookings() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(BookingEntity);
  }

  async events() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(TempleEventEntity);
  }

  async eventChecklist() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(EventChecklistEntity);
  }

  async rentalAssets() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(RentalAssetEntity);
  }

  async rentalOrders() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(RentalOrderEntity);
  }

  async sponsors() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(SponsorEntity);
  }

  async recognitionItems() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(RecognitionItemEntity);
  }

  async prasadamSponsorships() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(PrasadamSponsorshipEntity);
  }

  async donations() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(DonationEntity);
  }

  async campaigns() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(DonationCampaignEntity);
  }

  async donationSubscriptions() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(DonationSubscriptionEntity);
  }

  async vendorPayments() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(VendorPaymentEntity);
  }

  async queueTokens() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(QueueTokenEntity);
  }

  async staff() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(StaffEntity);
  }

  async volunteerShifts() {
    await this.ensureSeeded();
    const ds = await this.requireConnections().getDataSource(TenantContextStorage.get());
    return ds.getRepository(VolunteerShiftEntity);
  }
}
