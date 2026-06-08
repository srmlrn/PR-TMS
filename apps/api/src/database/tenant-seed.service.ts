import { Injectable, Logger } from '@nestjs/common';
import { GANESHA_TEMPLE_ID, POS_SALES_CATALOG, TenantContext } from '@tms/types';
import { TenantConnectionService } from './tenant-connection.service';
import { seedCommitteesToPostgres } from '../modules/committee/committee-postgres.seed';
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
  DonationEntity,
  VendorPaymentEntity,
  QueueTokenEntity,
  StaffEntity,
  VolunteerShiftEntity,
  PosProductEntity,
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

    if (ctx.tenantSlug === 'sri-ganesha-temple' || ctx.tenantId === GANESHA_TEMPLE_ID) {
      await this.seedGaneshaTemple(ctx);
      this.seeded.add(k);
      return;
    }

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
        id: 'evt-brahmotsavam-2026',
        name: 'Brahmotsavam 2026', type: 'festival', stage: 'confirmed',
        startDate: new Date('2026-06-08'), endDate: new Date('2026-06-15'),
        venues: ['Main Hall', 'Kalyana Mandapam', 'Open Ground'],
        expectedFootfall: 4200, budgetPlanned: 82000, revenueTarget: 95000,
        volunteerCategory: 'festival', volunteersNeeded: 36,
        volunteerRoles: [
          { role: 'setup', slotsNeeded: 10, description: 'Festival setup' },
          { role: 'kitchen', slotsNeeded: 8, description: 'Annadanam service' },
          { role: 'parking', slotsNeeded: 8, description: 'Parking & queue' },
        ],
        checklistProgress: { done: 6, total: 10 },
      }),
    );

    const navaratri = await eventRepo.save(
      eventRepo.create({
        id: 'evt-navaratri-2026',
        name: 'Navaratri 2026', type: 'festival', stage: 'confirmed',
        startDate: new Date('2026-09-20'), endDate: new Date('2026-09-28'),
        venues: ['Main Hall', 'Open Ground'],
        expectedFootfall: 2500, volunteerCategory: 'setup', volunteersNeeded: 14,
        checklistProgress: { done: 1, total: 4 },
      }),
    );

    const sundayAnnadanam = await eventRepo.save(
      eventRepo.create({
        id: 'evt-sunday-annadanam',
        name: 'Sunday Annadanam', type: 'community', stage: 'in_progress',
        startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
        venues: ['Community Kitchen', 'Dining Hall'],
        volunteerCategory: 'annadanam', volunteersNeeded: 14,
        checklistProgress: { done: 2, total: 2 },
      }),
    );

    void navaratri;
    void sundayAnnadanam;

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

    const staffRepo = ds.getRepository(StaffEntity);
    await staffRepo.save([
      staffRepo.create({
        id: 'user-priest-001',
        name: 'Sri Raman',
        role: 'priest',
        email: 'priest@svtemple.org',
        isActive: true,
      }),
      staffRepo.create({
        id: 'user-priest-002',
        name: 'Swami Venkat',
        role: 'priest',
        email: 'venkat@svtemple.org',
        isActive: true,
      }),
      staffRepo.create({
        id: 'user-priest-003',
        name: 'Swami Ramanujan',
        role: 'priest',
        email: 'ramanujan@svtemple.org',
        isActive: true,
      }),
    ]);

    const shiftRepo = ds.getRepository(VolunteerShiftEntity);
    const pastCheckIn = new Date('2026-03-15T09:05:00').toISOString();
    const pastCheckOut = new Date('2026-03-15T12:45:00').toISOString();
    const pastHours =
      Math.round(
        ((new Date(pastCheckOut).getTime() - new Date(pastCheckIn).getTime()) /
          (1000 * 60 * 60)) *
          10,
      ) / 10;

    await shiftRepo.save([
      shiftRepo.create({
        id: 'vol-shift-past-001',
        title: 'Spring Festival Cleanup',
        date: '2026-03-15',
        startTime: '09:00',
        endTime: '13:00',
        slots: 6,
        role: 'general',
        category: 'festival',
        location: 'Temple Grounds',
        description: 'Post-festival cleanup and storage.',
        eventId: brahmotsavam.id,
        eventName: 'Spring Utsav 2026',
        coordinator: 'Ravi Kumar',
        signups: [
          {
            userId: 'user-volunteer-001',
            userName: 'Volunteer Priya',
            signedUpAt: '2026-03-10T10:00:00.000Z',
            checkedIn: true,
            checkedInAt: pastCheckIn,
            checkedOut: true,
            checkedOutAt: pastCheckOut,
            hoursLogged: pastHours,
          },
        ],
      }),
      shiftRepo.create({
        id: 'vol-shift-001',
        title: 'Brahmotsavam Setup',
        date: '2026-06-08',
        startTime: '09:00',
        endTime: '13:00',
        slots: 10,
        role: 'setup',
        category: 'festival',
        location: 'Main Hall',
        description: 'Stage setup, garlands, and altar preparation.',
        eventId: brahmotsavam.id,
        eventName: 'Brahmotsavam 2026',
        coordinator: 'Priya Sharma',
        signups: [],
      }),
      shiftRepo.create({
        id: 'vol-shift-002',
        title: 'Annadanam Service',
        date: '2026-06-09',
        startTime: '11:00',
        endTime: '14:00',
        slots: 6,
        role: 'kitchen',
        category: 'annadanam',
        location: 'Community Kitchen',
        description: 'Serve meals and manage serving lines.',
        eventId: brahmotsavam.id,
        eventName: 'Brahmotsavam 2026',
        coordinator: 'Lakshmi Devi',
        signups: [],
      }),
      shiftRepo.create({
        id: 'vol-shift-003',
        title: 'Parking & Queue',
        date: '2026-06-10',
        startTime: '08:00',
        endTime: '13:00',
        slots: 8,
        role: 'parking',
        category: 'festival',
        location: 'North Lot',
        description: 'Direct traffic and assist devotees at entry.',
        eventId: brahmotsavam.id,
        eventName: 'Brahmotsavam 2026',
        coordinator: 'Arun Patel',
        signups: [],
      }),
      shiftRepo.create({
        id: 'vol-shift-004',
        title: 'Kids Activity Zone',
        date: '2026-06-11',
        startTime: '10:00',
        endTime: '14:00',
        slots: 4,
        role: 'kids',
        category: 'cultural',
        location: 'Youth Center',
        description: 'Supervise crafts and story time for children.',
        eventId: brahmotsavam.id,
        eventName: 'Brahmotsavam 2026',
        coordinator: 'Meena Rao',
        signups: [],
      }),
      shiftRepo.create({
        id: 'vol-shift-nav-001',
        title: 'Navaratri Decoration',
        date: '2026-09-20',
        startTime: '10:00',
        endTime: '14:00',
        slots: 8,
        role: 'decoration',
        category: 'setup',
        location: 'Main Hall',
        description: 'Golu display, flowers, and garland arrangements.',
        eventId: navaratri.id,
        eventName: 'Navaratri 2026',
        coordinator: 'Sunita Iyer',
        signups: [],
      }),
      shiftRepo.create({
        id: 'vol-shift-recurring-001',
        title: 'Sunday Annadanam — Kitchen',
        date: '2026-06-08',
        startTime: '09:00',
        endTime: '13:00',
        slots: 6,
        role: 'kitchen',
        category: 'annadanam',
        location: 'Community Kitchen',
        description: 'Weekly annadanam seva — cooking and serving.',
        eventId: sundayAnnadanam.id,
        eventName: 'Sunday Annadanam',
        coordinator: 'Lakshmi Devi',
        isRecurringTemplate: true,
        templateKey: 'sunday-annadanam',
        signups: [],
      }),
    ]);

    await seedCommitteesToPostgres(ds, ctx.tenantId);
    this.seeded.add(k);
  }

  private async seedGaneshaTemple(ctx: TenantContext): Promise<void> {
    const ds = await this.connections.getDataSource(ctx);
    const devoteeRepo = ds.getRepository(DevoteeEntity);

    const familyId = crypto.randomUUID();
    const [amit, priya, raj, swetha] = await devoteeRepo.save([
      devoteeRepo.create({
        firstName: 'Amit',
        lastName: 'Reddy',
        email: 'amit@ex.com',
        phone: '+1 615-555-0142',
        country: 'US',
        gotram: 'Kashyapa',
        nakshatra: 'Ashwini',
        membershipTier: 'Patron',
        status: 'active',
      }),
      devoteeRepo.create({
        firstName: 'Priya',
        lastName: 'Iyer',
        phone: '+1 615-555-0198',
        country: 'US',
        gotram: 'Bharadwaja',
        membershipTier: 'Annual',
        status: 'active',
      }),
      devoteeRepo.create({
        firstName: 'Raj',
        lastName: 'Natarajan',
        title: 'Mr.',
        email: 'raj@ex.com',
        phone: '+1 615-555-0211',
        country: 'US',
        gotram: 'Atri',
        nakshatra: 'Rohini',
        gender: 'male',
        dateOfBirth: '1978-07-27',
        familyId,
        membershipTier: 'Annual',
        status: 'active',
        preferredLanguage: 'ta',
        indiaState: 'TN',
        communicationOptIn: true,
        phones: [
          { type: 'cell', number: '+1 615-555-0211', primary: true },
          { type: 'work', number: '+1 615-555-0299' },
        ],
        emails: [
          { type: 'home', address: 'raj@ex.com', primary: true },
          { type: 'work', address: 'raj.natarajan@work.com' },
        ],
        addresses: [
          {
            type: 'home',
            line1: '865 Bellevue Rd, J13',
            city: 'Nashville',
            state: 'TN',
            postalCode: '37221',
            country: 'US',
            primary: true,
          },
        ],
        address: {
          line1: '865 Bellevue Rd, J13',
          city: 'Nashville',
          state: 'TN',
          postalCode: '37221',
          country: 'US',
        },
      }),
      devoteeRepo.create({
        firstName: 'Swetha',
        lastName: 'Natarajan',
        phone: '+1 615-555-0212',
        country: 'US',
        gotram: 'Atri',
        familyId,
        membershipTier: 'Annual',
        status: 'active',
      }),
    ]);

    const sevaRepo = ds.getRepository(SevaServiceEntity);
    const services = await sevaRepo.save([
      sevaRepo.create({
        name: 'Archana',
        deity: 'Lord Ganesha',
        description: 'Daily archana with sankalpa name, gotram, and nakshatra',
        price: 25,
        priceOffSite: 51,
        currency: 'USD',
        durationMinutes: 30,
      }),
      sevaRepo.create({
        name: 'Abhishekam',
        deity: 'Lord Ganesha',
        description: 'Special abhishekam ritual bathing of the deity',
        price: 101,
        priceOffSite: 151,
        currency: 'USD',
        durationMinutes: 60,
      }),
      sevaRepo.create({
        name: 'Homam',
        deity: 'Lord Ganesha',
        description: 'Sacred fire ritual with priest-led homam',
        price: 251,
        priceOffSite: 401,
        currency: 'USD',
        durationMinutes: 90,
      }),
      sevaRepo.create({
        name: 'VIP Darshan',
        deity: 'Lord Ganesha',
        description: 'Priority darshan with shorter queue wait (on-site only)',
        price: 51,
        currency: 'USD',
        durationMinutes: 15,
      }),
    ]);

    const archana = services[0];
    const abhishekam = services[1];

    const bookingRepo = ds.getRepository(BookingEntity);
    const today = new Date().toISOString().slice(0, 10);
    await bookingRepo.save([
      bookingRepo.create({
        devoteeId: raj.id,
        serviceId: archana.id,
        scheduledAt: new Date('2026-06-06T15:00:00Z'),
        status: 'confirmed',
        amount: 25,
        currency: 'USD',
        channel: 'counter',
        sankalpa: { sponsorName: 'Raj Natarajan', gotram: 'Atri', occasion: '60th Birthday' },
        receiptNumber: 'RCT-2026-3101',
      }),
      bookingRepo.create({
        devoteeId: raj.id,
        serviceId: abhishekam.id,
        scheduledAt: new Date('2026-06-14T14:00:00.000Z'),
        status: 'confirmed',
        amount: 101,
        currency: 'USD',
        channel: 'app',
        sankalpa: { sponsorName: 'Raj & Swetha Natarajan', gotram: 'Atri' },
        receiptNumber: 'RCT-2026-3102',
      }),
      bookingRepo.create({
        devoteeId: priya.id,
        serviceId: archana.id,
        scheduledAt: new Date('2026-05-20T16:00:00.000Z'),
        status: 'completed',
        amount: 25,
        currency: 'USD',
        channel: 'counter',
        receiptNumber: 'RCT-2026-3100',
      }),
      bookingRepo.create({
        devoteeId: amit.id,
        serviceId: archana.id,
        scheduledAt: new Date(`${today}T10:00:00.000Z`),
        status: 'confirmed',
        amount: 25,
        currency: 'USD',
        channel: 'app',
        sankalpa: { sponsorName: 'Amit R.', gotram: 'Kashyapa', nakshatra: 'Ashwini' },
        receiptNumber: 'SGT-2026-0101',
      }),
    ]);

    const donationRepo = ds.getRepository(DonationEntity);
    await donationRepo.save([
      donationRepo.create({
        devoteeId: raj.id,
        amount: 250,
        currency: 'USD',
        purpose: 'General Hundi',
        receiptNumber: 'RCT-2026-3098',
        taxCompliant: true,
        paymentStatus: 'paid',
      }),
      donationRepo.create({
        devoteeId: priya.id,
        amount: 150,
        currency: 'USD',
        purpose: 'Annadanam',
        receiptNumber: 'RCT-2026-3099',
        taxCompliant: true,
        paymentStatus: 'paid',
      }),
    ]);

    const posRepo = ds.getRepository(PosProductEntity);
    await posRepo.save(
      POS_SALES_CATALOG.map((item) =>
        posRepo.create({
          name: item.name,
          price: item.price,
          currency: item.currency,
          isActive: true,
        }),
      ),
    );

    const tokenRepo = ds.getRepository(QueueTokenEntity);
    for (let i = 1; i <= 53; i++) {
      await tokenRepo.save(
        tokenRepo.create({
          token: `A-${String(i).padStart(3, '0')}`,
          position: i,
          estimatedWaitMinutes: 22,
          status: 'waiting',
          queueType: 'darshan',
          priority: false,
        }),
      );
    }

    void swetha;

    const eventRepo = ds.getRepository(TempleEventEntity);
    const chaturthi = await eventRepo.save(
      eventRepo.create({
        id: 'evt-sgt-chaturthi-2026',
        name: 'Ganesha Chaturthi 2026',
        type: 'festival',
        stage: 'confirmed',
        startDate: new Date('2026-08-26'),
        endDate: new Date('2026-09-06'),
        venues: ['Main Shrine', 'Cultural Hall'],
        expectedFootfall: 3200,
        budgetPlanned: 58_000,
        revenueTarget: 72_000,
        volunteerCategory: 'festival',
        volunteersNeeded: 28,
        volunteerRoles: [
          { role: 'setup', slotsNeeded: 8, description: 'Mandap setup' },
          { role: 'kitchen', slotsNeeded: 10, description: 'Modak & annadanam' },
        ],
        checklistProgress: { done: 4, total: 7 },
      }),
    );

    await eventRepo.save(
      eventRepo.create({
        id: 'evt-sgt-sunday-annadanam',
        name: 'Sunday Annadanam',
        type: 'community',
        stage: 'in_progress',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        venues: ['Community Kitchen', 'Dining Hall'],
        volunteerCategory: 'annadanam',
        volunteersNeeded: 12,
        checklistProgress: { done: 2, total: 2 },
      }),
    );

    const shiftRepo = ds.getRepository(VolunteerShiftEntity);
    await shiftRepo.save([
      shiftRepo.create({
        id: 'sgt-vol-shift-001',
        title: 'Chaturthi Mandap Setup',
        date: '2026-08-26',
        startTime: '09:00',
        endTime: '13:00',
        slots: 8,
        role: 'setup',
        category: 'festival',
        location: 'Main Shrine',
        description: 'Ganesha mandap and floral decorations.',
        eventId: chaturthi.id,
        eventName: 'Ganesha Chaturthi 2026',
        coordinator: 'Priya Iyer',
        signups: [],
      }),
    ]);

    const staffRepo = ds.getRepository(StaffEntity);
    await staffRepo.save(
      staffRepo.create({
        id: 'user-ganesha-priest-001',
        name: 'Sri Murugan',
        role: 'priest',
        email: 'priest@sgtemple.org',
        isActive: true,
      }),
    );

    const campaignRepo = ds.getRepository(DonationCampaignEntity);
    await campaignRepo.save(
      campaignRepo.create({
        name: 'Temple Expansion Fund',
        targetAmount: 75000,
        raisedAmount: 42000,
        currency: 'USD',
      }),
    );

    await seedCommitteesToPostgres(ds, ctx.tenantId);
  }
}
