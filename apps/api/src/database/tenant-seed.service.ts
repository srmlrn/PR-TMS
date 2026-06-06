import { Injectable, Logger } from '@nestjs/common';
import { TenantContext } from '@tms/types';
import { TenantConnectionService } from './tenant-connection.service';
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
  DonationCampaignEntity,
  VendorPaymentEntity,
  QueueTokenEntity,
} from './entities/tenant';

@Injectable()
export class TenantSeedService {
  private readonly logger = new Logger(TenantSeedService.name);
  private readonly seeded = new Set<string>();

  constructor(private readonly connections: TenantConnectionService) {}

  private key(ctx: TenantContext): string {
    return `${ctx.tenantId}:${ctx.environment}`;
  }

  async seedIfEmpty(ctx: TenantContext): Promise<void> {
    const k = this.key(ctx);
    if (this.seeded.has(k)) return;

    const ds = await this.connections.getDataSource(ctx);
    const devoteeRepo = ds.getRepository(DevoteeEntity);
    if ((await devoteeRepo.count()) > 0) {
      this.seeded.add(k);
      return;
    }

    this.logger.log(`Seeding tenant-env DB: ${ctx.dbName}`);

    const [rajan, priya, meena] = await devoteeRepo.save([
      devoteeRepo.create({
        firstName: 'Rajan', lastName: 'Krishnamurthy', email: 'rajan@ex.com',
        phone: '+1 510-555-0191', country: 'US', gotram: 'Bharadwaja', nakshatra: 'Rohini',
        membershipTier: 'Patron', status: 'active',
      }),
      devoteeRepo.create({
        firstName: 'Priya', lastName: 'Sharma', phone: '+91 98765-43210',
        country: 'IN', gotram: 'Kashyapa', membershipTier: 'Annual', status: 'active',
      }),
      devoteeRepo.create({
        firstName: 'Meena', lastName: 'Patel', phone: '+1 647-555-0303',
        country: 'CA', gotram: 'Vasishtha', membershipTier: 'Annual',
        status: ctx.environment === 'prod' ? 'renewal_due' : 'active',
      }),
    ]);

    const sevaRepo = ds.getRepository(SevaServiceEntity);
    const services = await sevaRepo.save([
      sevaRepo.create({ name: 'Archana', deity: 'Lord Venkateswara', price: 25, currency: 'USD', durationMinutes: 30 }),
      sevaRepo.create({ name: 'Abhishekam', deity: 'Lord Venkateswara', price: 101, currency: 'USD', durationMinutes: 60 }),
      sevaRepo.create({ name: 'Homam', deity: 'Lord Venkateswara', price: 251, currency: 'USD', durationMinutes: 90 }),
      sevaRepo.create({ name: 'VIP Darshan', deity: 'Lord Venkateswara', price: 51, currency: 'USD', durationMinutes: 15 }),
    ]);

    const bookingRepo = ds.getRepository(BookingEntity);
    await bookingRepo.save(
      bookingRepo.create({
        devoteeId: rajan.id, serviceId: services[0].id,
        scheduledAt: new Date('2026-06-07T09:00:00Z'),
        status: 'confirmed', amount: 20, currency: 'USD', channel: 'app',
        sankalpa: { sponsorName: 'Rajan K.', gotram: 'Bharadwaja', nakshatra: 'Rohini' },
        receiptNumber: 'RCT-2026-1801',
      }),
    );

    const eventRepo = ds.getRepository(TempleEventEntity);
    const brahmotsavam = await eventRepo.save(
      eventRepo.create({
        name: 'Brahmotsavam 2026', type: 'festival', stage: 'confirmed',
        startDate: new Date('2026-06-08'), endDate: new Date('2026-06-15'),
        venues: ['Main Hall', 'Kalyana Mandapam', 'Open Ground'],
        expectedFootfall: 4200, budgetPlanned: 82000, revenueTarget: 95000,
        checklistProgress: { done: 6, total: 10 },
      }),
    );

    const checklistRepo = ds.getRepository(EventChecklistEntity);
    await checklistRepo.save([
      checklistRepo.create({ eventId: brahmotsavam.id, title: 'Volunteer roster published', department: 'volunteers', isDone: true }),
      checklistRepo.create({ eventId: brahmotsavam.id, title: 'Book catering vendors', department: 'vendors', isDone: false }),
    ]);

    const assetRepo = ds.getRepository(RentalAssetEntity);
    await assetRepo.save([
      assetRepo.create({ name: 'PA System (Full)', category: 'av', quantity: 4, availableQuantity: 2, ratePerDay: 200, conditionGrade: 'A', status: 'available' }),
      assetRepo.create({ name: 'Banquet Chairs', category: 'furniture', quantity: 500, availableQuantity: 320, ratePerDay: 2, conditionGrade: 'B', status: 'available' }),
    ]);

    const sponsorRepo = ds.getRepository(SponsorEntity);
    const infosys = await sponsorRepo.save(
      sponsorRepo.create({
        name: 'Infosys BPM Ltd.', type: 'corporate', tier: 'platinum', pipelineStage: 'active',
        primaryContact: 'San Jose Office', committedAmount: 25000, paidAmount: 25000, currency: 'USD',
      }),
    );
    const recRepo = ds.getRepository(RecognitionItemEntity);
    await recRepo.save(
      recRepo.create({ sponsorId: infosys.id, item: 'Logo on event materials', isFulfilled: true, fulfilledAt: new Date() }),
    );

    const campaignRepo = ds.getRepository(DonationCampaignEntity);
    await campaignRepo.save([
      campaignRepo.create({ name: 'Temple Renovation 2026', targetAmount: 100000, raisedAmount: 72000, currency: 'USD' }),
      campaignRepo.create({ name: 'Annadanam Sponsorship', targetAmount: 10000, raisedAmount: 4500, currency: 'USD' }),
    ]);

    const vendorRepo = ds.getRepository(VendorPaymentEntity);
    await vendorRepo.save([
      vendorRepo.create({ vendorId: crypto.randomUUID(), vendorName: 'Fresh Flowers Co.', amount: 450, dueDate: '2026-06-10', status: 'pending' }),
    ]);

    const tokenRepo = ds.getRepository(QueueTokenEntity);
    for (let i = 1; i <= 53; i++) {
      await tokenRepo.save(tokenRepo.create({ token: `A-${String(i).padStart(3, '0')}`, position: i, estimatedWaitMinutes: 22, status: 'waiting' }));
    }

    const prasadamRepo = ds.getRepository(PrasadamSponsorshipEntity);
    await prasadamRepo.save(
      prasadamRepo.create({
        type: 'daily', packageTier: 'gold', devoteeId: rajan.id,
        scheduledDate: '2026-06-06', deity: 'Lord Venkateswara', amount: 151, currency: 'USD',
        sankalpa: { sponsorName: 'Rajan K.', occasion: 'Birthday' }, status: 'prepared',
      }),
    );

    void priya;
    void meena;
    this.seeded.add(k);
  }
}
