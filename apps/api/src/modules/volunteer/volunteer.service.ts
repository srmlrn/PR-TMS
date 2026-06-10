import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  AuthUser,
  CreateVolunteerShiftInput,
  DEMO_TENANT_IDS,
  EventLifecycleStage,
  GANESHA_TEMPLE_ID,
  GenerateEventShiftsResult,
  getTenantBranding,
  NotifyEventVolunteersResult,
  SV_TEMPLE_ID,
  TempleEvent,
  UserRole,
  VolunteerCertificate,
  VolunteerNotifyAudience,
  VolunteerBadgeTier,
  VolunteerCategory,
  VolunteerOpportunity,
  VolunteerPreferences,
  VolunteerRoleNeed,
  VolunteerShift,
  VolunteerShiftRole,
  VolunteerSignup,
  VolunteerSignupStatus,
  VolunteerStats,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { VolunteerShiftEntity } from '../../database/entities/tenant/volunteer-shift.entity';
import { TenantDataService } from '../../database/tenant-data.service';
import { DEMO_USERS } from '../auth/demo-users';
import { NotificationsService } from '../notifications/notifications.service';

type VolunteerShiftRecord = VolunteerShift & TenantEntity;

const DEMO_TENANT = SV_TEMPLE_ID;

/** Fixed demo event IDs — must match event.service seedDemoData */
export const DEMO_EVENT_IDS = {
  brahmotsavam: 'evt-brahmotsavam-2026',
  navaratri: 'evt-navaratri-2026',
  shivaratri: 'evt-shivaratri-2026',
  sundayAnnadanam: 'evt-sunday-annadanam',
} as const;

export const GANESHA_EVENT_IDS = {
  chaturthi: 'evt-sgt-chaturthi-2026',
  diwali: 'evt-sgt-diwali-2026',
  sundayAnnadanam: 'evt-sgt-sunday-annadanam',
} as const;

const DEFAULT_EVENT_SHIFTS: Record<
  VolunteerCategory,
  Array<{
    title: string;
    role: VolunteerShiftRole;
    slots: number;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
    dayOffset: number;
  }>
> = {
  festival: [
    { title: 'Festival Setup', role: 'setup', slots: 10, startTime: '09:00', endTime: '13:00', location: 'Main Hall', description: 'Stage, garlands, and altar preparation.', dayOffset: 0 },
    { title: 'Annadanam Service', role: 'kitchen', slots: 8, startTime: '11:00', endTime: '14:00', location: 'Community Kitchen', description: 'Meal prep and serving lines.', dayOffset: 1 },
    { title: 'Parking & Queue', role: 'parking', slots: 8, startTime: '08:00', endTime: '13:00', location: 'North Lot', description: 'Traffic and devotee entry assistance.', dayOffset: 2 },
    { title: 'Crowd Management', role: 'crowd', slots: 6, startTime: '10:00', endTime: '15:00', location: 'Main Entrance', description: 'Queue lines and darshan flow.', dayOffset: 3 },
    { title: 'Kids Activity Zone', role: 'kids', slots: 4, startTime: '10:00', endTime: '14:00', location: 'Youth Center', description: 'Crafts and story time.', dayOffset: 4 },
  ],
  pooja: [
    { title: 'Puja Assistant', role: 'priest_assist', slots: 4, startTime: '08:00', endTime: '11:00', location: 'Sanctum', description: 'Assist priests during special puja.', dayOffset: 0 },
    { title: 'Prasad Preparation', role: 'kitchen', slots: 6, startTime: '09:00', endTime: '12:00', location: 'Kitchen', description: 'Prepare and plate prasad offerings.', dayOffset: 0 },
  ],
  annadanam: [
    { title: 'Kitchen Prep', role: 'kitchen', slots: 6, startTime: '08:00', endTime: '11:00', location: 'Community Kitchen', description: 'Cooking and meal preparation.', dayOffset: 0 },
    { title: 'Serving Line', role: 'kitchen', slots: 8, startTime: '11:30', endTime: '14:00', location: 'Dining Hall', description: 'Serve meals to devotees.', dayOffset: 0 },
    { title: 'Cleanup Crew', role: 'general', slots: 4, startTime: '14:00', endTime: '16:00', location: 'Dining Hall', description: 'Post-meal cleanup and storage.', dayOffset: 0 },
  ],
  setup: [
    { title: 'Decoration Team', role: 'decoration', slots: 8, startTime: '09:00', endTime: '13:00', location: 'Main Hall', description: 'Rangoli, flowers, and lighting.', dayOffset: 0 },
    { title: 'Teardown Crew', role: 'setup', slots: 6, startTime: '18:00', endTime: '21:00', location: 'Temple Grounds', description: 'Post-event breakdown and storage.', dayOffset: 1 },
  ],
  cultural: [
    { title: 'Cultural Program MC', role: 'cultural', slots: 2, startTime: '17:00', endTime: '21:00', location: 'Main Hall', description: 'Stage coordination and announcements.', dayOffset: 0 },
    { title: 'AV & Sound', role: 'general', slots: 3, startTime: '16:00', endTime: '22:00', location: 'Main Hall', description: 'Microphones, speakers, and live stream.', dayOffset: 0 },
  ],
  general: [
    { title: 'General Seva', role: 'general', slots: 6, startTime: '09:00', endTime: '13:00', location: 'Temple Grounds', description: 'General temple support tasks.', dayOffset: 0 },
  ],
};

function hoursBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, Math.round(((end - start) / (1000 * 60 * 60)) * 10) / 10);
}

function computeBadgeTier(hours: number): VolunteerBadgeTier {
  if (hours >= 100) return 'platinum';
  if (hours >= 60) return 'gold';
  if (hours >= 20) return 'silver';
  return 'bronze';
}

function nextBadgeAtHours(tier: VolunteerBadgeTier): number | undefined {
  switch (tier) {
    case 'bronze':
      return 20;
    case 'silver':
      return 60;
    case 'gold':
      return 100;
    case 'platinum':
      return undefined;
  }
}

function progressToNextBadge(hours: number, tier: VolunteerBadgeTier): number {
  if (tier === 'platinum') return 100;
  const next = nextBadgeAtHours(tier)!;
  const prev = tier === 'bronze' ? 0 : tier === 'silver' ? 20 : 60;
  return Math.min(100, Math.round(((hours - prev) / (next - prev)) * 100));
}

function isInQuarter(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3);
  return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === quarter;
}

function isInYear(iso: string, now = new Date()): boolean {
  return new Date(iso).getFullYear() === now.getFullYear();
}

function shiftEndDateTime(shift: VolunteerShift): Date {
  const [h, m] = shift.endTime.split(':').map(Number);
  const d = new Date(`${shift.date}T00:00:00`);
  d.setHours(h, m ?? 0, 0, 0);
  return d;
}

function isShiftPast(shift: VolunteerShift, now = new Date()): boolean {
  return shiftEndDateTime(shift).getTime() < now.getTime();
}

function signupStatus(signup: VolunteerSignup): VolunteerSignupStatus {
  return signup.status ?? 'confirmed';
}

function confirmedSignups(signups: VolunteerSignup[]): VolunteerSignup[] {
  return signups.filter((s) => signupStatus(s) === 'confirmed');
}

function waitlistedSignups(signups: VolunteerSignup[]): VolunteerSignup[] {
  return signups
    .filter((s) => signupStatus(s) === 'waitlisted')
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function eventCategory(event: TempleEvent): VolunteerCategory {
  if (event.volunteerCategory) return event.volunteerCategory;
  if (event.type === 'festival') return 'festival';
  if (event.type === 'cultural') return 'cultural';
  return 'general';
}

@Injectable()
export class VolunteerService
  extends BaseTenantService<VolunteerShiftRecord>
  implements OnModuleInit
{
  protected store = new Map<string, VolunteerShiftRecord>();
  private preferencesStore = new Map<string, VolunteerPreferences>();

  constructor(
    private readonly tenantData: TenantDataService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      for (const tenantId of DEMO_TENANT_IDS) {
        this.seedDemoShifts(tenantId);
      }
    }
  }

  private seedDemoShifts(tenantId: string): void {
    if (this.scoped(tenantId).length > 0) return;

    const now = new Date();
    const isGanesha = tenantId === GANESHA_TEMPLE_ID;
    const volunteerUserId = isGanesha ? 'user-ganesha-volunteer-001' : 'user-volunteer-001';
    const volunteerUserName = isGanesha ? 'Volunteer Lakshmi' : 'Volunteer Priya';
    const idPrefix = isGanesha ? 'sgt-' : '';
    const pastCheckIn = new Date('2026-03-15T09:05:00').toISOString();
    const pastCheckOut = new Date('2026-03-15T12:45:00').toISOString();

    const shifts: Array<Omit<VolunteerShiftRecord, 'createdAt' | 'updatedAt'>> = isGanesha
      ? [
          {
            id: `${idPrefix}vol-shift-past-001`,
            tenantId,
            title: 'Spring Cleanup',
            date: '2026-03-15',
            startTime: '09:00',
            endTime: '13:00',
            slots: 6,
            role: 'general',
            category: 'festival',
            location: 'Temple Grounds',
            description: 'Post-event cleanup.',
            eventId: GANESHA_EVENT_IDS.chaturthi,
            eventName: 'Spring Seva 2026',
            coordinator: 'Venkat Rao',
            signups: [
              {
                userId: volunteerUserId,
                userName: volunteerUserName,
                signedUpAt: '2026-03-10T10:00:00.000Z',
                status: 'confirmed',
                checkedIn: true,
                checkedInAt: pastCheckIn,
                checkedOut: true,
                checkedOutAt: pastCheckOut,
                hoursLogged: hoursBetween(pastCheckIn, pastCheckOut),
              },
            ],
          },
          {
            id: `${idPrefix}vol-shift-001`,
            tenantId,
            title: 'Chaturthi Mandap Setup',
            date: '2026-08-26',
            startTime: '09:00',
            endTime: '13:00',
            slots: 8,
            role: 'setup',
            category: 'festival',
            location: 'Main Shrine',
            description: 'Ganesha mandap, flowers, and lighting.',
            eventId: GANESHA_EVENT_IDS.chaturthi,
            eventName: 'Ganesha Chaturthi 2026',
            coordinator: 'Priya Iyer',
            signups: [],
          },
          {
            id: `${idPrefix}vol-shift-002`,
            tenantId,
            title: 'Modak Kitchen',
            date: '2026-08-27',
            startTime: '10:00',
            endTime: '14:00',
            slots: 10,
            role: 'kitchen',
            category: 'annadanam',
            location: 'Community Kitchen',
            description: 'Prepare modaks and festival meals.',
            eventId: GANESHA_EVENT_IDS.chaturthi,
            eventName: 'Ganesha Chaturthi 2026',
            coordinator: 'Lakshmi Natarajan',
            signups: [],
          },
          {
            id: `${idPrefix}vol-shift-003`,
            tenantId,
            title: 'Festival Parking',
            date: '2026-08-28',
            startTime: '08:00',
            endTime: '13:00',
            slots: 6,
            role: 'parking',
            category: 'festival',
            location: 'South Lot',
            description: 'Direct traffic during Chaturthi.',
            eventId: GANESHA_EVENT_IDS.chaturthi,
            eventName: 'Ganesha Chaturthi 2026',
            coordinator: 'Arun Patel',
            signups: [],
          },
          {
            id: `${idPrefix}vol-shift-recurring-001`,
            tenantId,
            title: 'Sunday Annadanam — Kitchen',
            date: '2026-06-08',
            startTime: '09:00',
            endTime: '13:00',
            slots: 6,
            role: 'kitchen',
            category: 'annadanam',
            location: 'Community Kitchen',
            description: 'Weekly annadanam seva.',
            eventId: GANESHA_EVENT_IDS.sundayAnnadanam,
            eventName: 'Sunday Annadanam',
            coordinator: 'Lakshmi Natarajan',
            isRecurringTemplate: true,
            templateKey: 'sunday-annadanam',
            signups: [],
          },
        ]
      : [
      {
        id: 'vol-shift-past-001',
        tenantId,
        title: 'Spring Festival Cleanup',
        date: '2026-03-15',
        startTime: '09:00',
        endTime: '13:00',
        slots: 6,
        role: 'general',
        category: 'festival',
        location: 'Temple Grounds',
        description: 'Post-festival cleanup and storage.',
        eventId: DEMO_EVENT_IDS.brahmotsavam,
        eventName: 'Spring Utsav 2026',
        coordinator: 'Ravi Kumar',
        signups: [
          {
            userId: volunteerUserId,
            userName: volunteerUserName,
            signedUpAt: '2026-03-10T10:00:00.000Z',
            status: 'confirmed',
            checkedIn: true,
            checkedInAt: pastCheckIn,
            checkedOut: true,
            checkedOutAt: pastCheckOut,
            hoursLogged: hoursBetween(pastCheckIn, pastCheckOut),
          },
        ],
      },
      {
        id: 'vol-shift-001',
        tenantId,
        title: 'Brahmotsavam Setup',
        date: '2026-06-08',
        startTime: '09:00',
        endTime: '13:00',
        slots: 10,
        role: 'setup',
        category: 'festival',
        location: 'Main Hall',
        description: 'Stage setup, garlands, and altar preparation.',
        eventId: DEMO_EVENT_IDS.brahmotsavam,
        eventName: 'Brahmotsavam 2026',
        coordinator: 'Priya Sharma',
        signups: [
          {
            userId: 'user-volunteer-001',
            userName: 'Volunteer Priya',
            signedUpAt: now.toISOString(),
            status: 'confirmed',
            checkedIn: false,
          },
        ],
      },
      {
        id: 'vol-shift-002',
        tenantId,
        title: 'Annadanam Service',
        date: '2026-06-09',
        startTime: '11:00',
        endTime: '14:00',
        slots: 6,
        role: 'kitchen',
        category: 'annadanam',
        location: 'Community Kitchen',
        description: 'Serve meals and manage serving lines.',
        eventId: DEMO_EVENT_IDS.brahmotsavam,
        eventName: 'Brahmotsavam 2026',
        coordinator: 'Lakshmi Devi',
        signups: [
          {
            userId: 'user-volunteer-001',
            userName: 'Volunteer Priya',
            signedUpAt: now.toISOString(),
            status: 'confirmed',
            checkedIn: true,
            checkedInAt: now.toISOString(),
          },
        ],
      },
      {
        id: 'vol-shift-003',
        tenantId,
        title: 'Parking & Queue',
        date: '2026-06-10',
        startTime: '08:00',
        endTime: '13:00',
        slots: 8,
        role: 'parking',
        category: 'festival',
        location: 'North Lot',
        description: 'Direct traffic and assist devotees at entry.',
        eventId: DEMO_EVENT_IDS.brahmotsavam,
        eventName: 'Brahmotsavam 2026',
        coordinator: 'Arun Patel',
        signups: [],
      },
      {
        id: 'vol-shift-004',
        tenantId,
        title: 'Kids Activity Zone',
        date: '2026-06-11',
        startTime: '10:00',
        endTime: '14:00',
        slots: 4,
        role: 'kids',
        category: 'cultural',
        location: 'Youth Center',
        description: 'Supervise crafts and story time for children.',
        eventId: DEMO_EVENT_IDS.brahmotsavam,
        eventName: 'Brahmotsavam 2026',
        coordinator: 'Meena Rao',
        signups: [],
      },
      {
        id: 'vol-shift-nav-001',
        tenantId,
        title: 'Navaratri Decoration',
        date: '2026-09-20',
        startTime: '10:00',
        endTime: '14:00',
        slots: 8,
        role: 'decoration',
        category: 'setup',
        location: 'Main Hall',
        description: 'Golu display, flowers, and garland arrangements for all nine nights.',
        eventId: DEMO_EVENT_IDS.navaratri,
        eventName: 'Navaratri 2026',
        coordinator: 'Sunita Iyer',
        signups: [],
      },
      {
        id: 'vol-shift-nav-002',
        tenantId,
        title: 'Garba Night Kitchen',
        date: '2026-09-22',
        startTime: '17:00',
        endTime: '21:00',
        slots: 6,
        role: 'kitchen',
        category: 'cultural',
        location: 'Open Ground',
        description: 'Snacks and prasad for garba evenings.',
        eventId: DEMO_EVENT_IDS.navaratri,
        eventName: 'Navaratri 2026',
        coordinator: 'Lakshmi Devi',
        signups: [],
      },
      {
        id: 'vol-shift-shiv-001',
        tenantId,
        title: 'Shivaratri Night Seva',
        date: '2026-02-26',
        startTime: '22:00',
        endTime: '02:00',
        slots: 12,
        role: 'priest_assist',
        category: 'pooja',
        location: 'Shiva Sannidhi',
        description: 'All-night abhishekam assistance and crowd support.',
        eventId: DEMO_EVENT_IDS.shivaratri,
        eventName: 'Maha Shivaratri 2026',
        coordinator: 'Sri Raman',
        signups: [],
      },
      {
        id: 'vol-shift-recurring-001',
        tenantId,
        title: 'Sunday Annadanam — Kitchen',
        date: '2026-06-08',
        startTime: '09:00',
        endTime: '13:00',
        slots: 6,
        role: 'kitchen',
        category: 'annadanam',
        location: 'Community Kitchen',
        description: 'Weekly annadanam seva — cooking and serving.',
        eventId: DEMO_EVENT_IDS.sundayAnnadanam,
        eventName: 'Sunday Annadanam',
        coordinator: 'Lakshmi Devi',
        isRecurringTemplate: true,
        templateKey: 'sunday-annadanam',
        signups: [],
      },
      {
        id: 'vol-shift-recurring-002',
        tenantId,
        title: 'Sunday Annadanam — Serving',
        date: '2026-06-08',
        startTime: '11:30',
        endTime: '14:00',
        slots: 8,
        role: 'kitchen',
        category: 'annadanam',
        location: 'Dining Hall',
        description: 'Weekly annadanam seva — serving line.',
        eventId: DEMO_EVENT_IDS.sundayAnnadanam,
        eventName: 'Sunday Annadanam',
        coordinator: 'Arun Patel',
        isRecurringTemplate: true,
        templateKey: 'sunday-annadanam',
        signups: [],
      },
    ];

    for (const shift of shifts) {
      this.store.set(shift.id, { ...shift, createdAt: now, updatedAt: now });
    }
  }

  async findAll(tenantId: string, category?: VolunteerCategory): Promise<VolunteerShift[]> {
    const shifts = await this.loadShifts(tenantId);
    const filtered = category
      ? shifts.filter((s) => s.category === category)
      : shifts;
    return filtered.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }

  async findByEvent(tenantId: string, eventId: string): Promise<VolunteerShift[]> {
    const shifts = await this.loadShifts(tenantId);
    return shifts
      .filter((s) => s.eventId === eventId)
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }

  async getRecurringTemplates(tenantId: string): Promise<VolunteerShift[]> {
    const shifts = await this.loadShifts(tenantId);
    return shifts.filter((s) => s.isRecurringTemplate);
  }

  async getOpportunities(
    tenantId: string,
    category?: VolunteerCategory,
  ): Promise<VolunteerOpportunity[]> {
    const events = await this.loadActiveEvents(tenantId);
    const shifts = (await this.loadShifts(tenantId)).filter((s) => !isShiftPast(s));

    const byEvent = new Map<string, VolunteerShift[]>();
    for (const shift of shifts) {
      if (!shift.eventId) continue;
      const list = byEvent.get(shift.eventId) ?? [];
      list.push(shift);
      byEvent.set(shift.eventId, list);
    }

    const opportunities: VolunteerOpportunity[] = [];

    for (const event of events) {
      const cat = eventCategory(event);
      if (category && cat !== category) continue;

      const eventShifts = byEvent.get(event.id) ?? [];
      let slotsTotal = 0;
      let slotsFilled = 0;
      let shiftsOpen = 0;

      for (const shift of eventShifts) {
        slotsTotal += shift.slots;
        slotsFilled += confirmedSignups(shift.signups).length;
        if (confirmedSignups(shift.signups).length < shift.slots) {
          shiftsOpen += 1;
        }
      }

      const roles = event.volunteerRoles ?? this.aggregateRoles(eventShifts);

      opportunities.push({
        eventId: event.id,
        eventName: event.name,
        category: cat,
        startDate: new Date(event.startDate).toISOString().slice(0, 10),
        endDate: new Date(event.endDate).toISOString().slice(0, 10),
        stage: event.stage,
        volunteersNeeded: event.volunteersNeeded ?? slotsTotal,
        shiftsTotal: eventShifts.length,
        shiftsOpen,
        slotsTotal,
        slotsFilled,
        slotsRemaining: Math.max(0, slotsTotal - slotsFilled),
        roles,
      });
    }

    return opportunities.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  async create(tenantId: string, input: CreateVolunteerShiftInput): Promise<VolunteerShift> {
    if (this.usePostgres) {
      const repo = await this.tenantData.volunteerShifts();
      const saved = await repo.save(
        repo.create({
          id: crypto.randomUUID(),
          ...this.shiftInputToRowFields(input),
          signups: [],
        }),
      );
      return this.toShift(saved);
    }

    this.seedDemoShifts(tenantId);
    const record = this.createEntity(tenantId, {
      ...this.shiftInputToEntityFields(input),
      signups: [],
    });
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...shift } = record;
    return shift;
  }

  async generateEventShifts(
    tenantId: string,
    eventId: string,
    user?: AuthUser,
  ): Promise<GenerateEventShiftsResult> {
    const event = await this.loadEvent(tenantId, eventId);
    const category = eventCategory(event);
    const templates = event.volunteerRoles?.length
      ? event.volunteerRoles.map((r, i) => ({
          title: r.description ?? `${r.role} seva`,
          role: r.role,
          slots: r.slotsNeeded,
          startTime: '09:00',
          endTime: '13:00',
          location: event.venues[0] ?? 'Temple Grounds',
          description: r.description ?? `Volunteer for ${event.name}`,
          dayOffset: i,
        }))
      : DEFAULT_EVENT_SHIFTS[category];

    const startIso = new Date(event.startDate).toISOString().slice(0, 10);
    const existing = await this.findByEvent(tenantId, eventId);
    const created: VolunteerShift[] = [];

    for (const tpl of templates) {
      const title = `${event.name} — ${tpl.title}`;
      if (existing.some((s) => s.title === title)) continue;

      const shift = await this.create(tenantId, {
        title,
        date: addDays(startIso, tpl.dayOffset),
        startTime: tpl.startTime,
        endTime: tpl.endTime,
        slots: tpl.slots,
        role: tpl.role,
        location: tpl.location,
        description: tpl.description,
        eventId: event.id,
        eventName: event.name,
        category,
      });
      created.push(shift);
    }

    if (user) {
      this.notifications.createInApp(
        tenantId,
        user.id,
        'volunteer_new_opportunity',
        `${created.length} shifts created`,
        `Generated ${created.length} volunteer shifts for ${event.name}.`,
        { eventId: event.id },
      );
    }

    return { eventId, created };
  }

  async notifyEventVolunteers(
    tenantId: string,
    eventId: string,
    audience: VolunteerNotifyAudience = 'interested',
  ): Promise<NotifyEventVolunteersResult> {
    const event = await this.loadEvent(tenantId, eventId);
    const category = eventCategory(event);
    const shifts = await this.findByEvent(tenantId, eventId);

    if (audience === 'interested' && shifts.length === 0) {
      throw new BadRequestException(
        'Add volunteer shifts for this event before inviting volunteers.',
      );
    }

    let slotsTotal = 0;
    let slotsFilled = 0;
    let shiftsOpen = 0;
    for (const shift of shifts) {
      slotsTotal += shift.slots;
      const filled = confirmedSignups(shift.signups).length;
      slotsFilled += filled;
      if (filled < shift.slots) {
        shiftsOpen += 1;
      }
    }
    const slotsRemaining = Math.max(0, slotsTotal - slotsFilled);

    let targetUserIds: string[];

    if (audience === 'assigned') {
      const ids = new Set<string>();
      for (const shift of shifts) {
        for (const signup of shift.signups) {
          if (signupStatus(signup) === 'confirmed') {
            ids.add(signup.userId);
          }
        }
      }
      targetUserIds = [...ids];
      if (targetUserIds.length === 0) {
        throw new BadRequestException('No confirmed volunteers on the roster for this event.');
      }
    } else {
      targetUserIds = DEMO_USERS.filter(
        (u) => u.tenantId === tenantId && u.role === UserRole.VOLUNTEER,
      )
        .filter((u) => {
          const prefs = this.getPreferences(tenantId, u.id);
          if (!prefs.notifyNewOpportunities) return false;
          if (prefs.categories.length === 0) return true;
          return prefs.categories.includes(category);
        })
        .map((u) => u.id);
    }

    let inApp = 0;
    let email = 0;

    for (const userId of targetUserIds) {
      const user = DEMO_USERS.find((u) => u.id === userId);
      if (!user) continue;

      if (audience === 'assigned') {
        const userShifts = shifts.filter((s) =>
          s.signups.some(
            (sg) => sg.userId === userId && signupStatus(sg) === 'confirmed',
          ),
        );
        const shiftList = userShifts
          .map((s) => `${s.title} (${s.date} ${s.startTime})`)
          .join('; ');

        this.notifications.createInApp(
          tenantId,
          userId,
          'volunteer_shift_reminder',
          `Reminder — ${event.name}`,
          `You are confirmed for: ${shiftList}. Please check in when you arrive.`,
          { eventId },
        );
        inApp += 1;

        const first = userShifts[0];
        if (first && user.email) {
          this.notifications.send({
            channel: 'sms',
            to: user.email,
            templateId: 'volunteer-shift-reminder',
            metadata: {
              shift: first.title,
              date: first.date,
              time: first.startTime,
              location: first.location ?? 'Temple',
            },
          });
          email += 1;
        }
      } else {
        this.notifications.createInApp(
          tenantId,
          userId,
          'volunteer_new_opportunity',
          `Volunteers needed — ${event.name}`,
          `${slotsRemaining} slots open across ${shiftsOpen || shifts.length} shifts. Sign up under Volunteering.`,
          { eventId },
        );
        inApp += 1;

        if (user.email) {
          this.notifications.send({
            channel: 'email',
            to: user.email,
            templateId: 'volunteer-new-opportunity',
            metadata: {
              name: user.name,
              event: event.name,
              slotsRemaining: String(slotsRemaining),
              shiftsOpen: String(shiftsOpen || shifts.length),
            },
          });
          email += 1;
        }
      }
    }

    return {
      eventId,
      audience,
      notified: targetUserIds.length,
      inApp,
      email,
    };
  }

  async signup(tenantId: string, shiftId: string, user: AuthUser): Promise<VolunteerShift> {
    const shift = await this.getShiftRecord(tenantId, shiftId);
    const signups = [...shift.signups];

    if (signups.some((s) => s.userId === user.id)) {
      throw new ConflictException('Already signed up for this shift');
    }

    const confirmed = confirmedSignups(signups);
    const isFull = confirmed.length >= shift.slots;

    if (isFull) {
      const waitlist = waitlistedSignups(signups);
      const position = waitlist.length + 1;
      signups.push({
        ...this.newSignup(user),
        status: 'waitlisted',
        waitlistPosition: position,
      });

      this.notifications.createInApp(
        tenantId,
        user.id,
        'volunteer_waitlisted',
        `Waitlisted — ${shift.title}`,
        `You are #${position} on the waitlist for ${shift.title} on ${shift.date}.`,
        { shiftId, eventId: shift.eventId ?? '' },
      );

      if (user.email) {
        this.notifications.send({
          channel: 'email',
          to: user.email,
          templateId: 'volunteer-waitlisted',
          metadata: {
            name: user.name,
            shift: shift.title,
            date: shift.date,
            position: String(position),
          },
        });
      }
    } else {
      signups.push({ ...this.newSignup(user), status: 'confirmed' });

      this.notifications.createInApp(
        tenantId,
        user.id,
        'volunteer_signup_confirmed',
        `Confirmed — ${shift.title}`,
        `${shift.title} on ${shift.date} at ${shift.startTime}. Location: ${shift.location ?? 'TBD'}.`,
        { shiftId, eventId: shift.eventId ?? '' },
      );

      if (user.email) {
        this.notifications.send({
          channel: 'email',
          to: user.email,
          templateId: 'volunteer-signup-confirmed',
          metadata: {
            name: user.name,
            shift: shift.title,
            date: shift.date,
            time: `${shift.startTime}–${shift.endTime}`,
            location: shift.location ?? 'TBD',
            coordinator: shift.coordinator ?? 'Temple office',
          },
        });
      }
    }

    return this.saveShift(tenantId, shiftId, signups);
  }

  async cancelSignup(tenantId: string, shiftId: string, user: AuthUser): Promise<VolunteerShift> {
    const shift = await this.getShiftRecord(tenantId, shiftId);
    const signups = [...shift.signups];
    const idx = signups.findIndex((s) => s.userId === user.id);

    if (idx === -1) {
      throw new BadRequestException('You are not signed up for this shift');
    }
    if (signups[idx].checkedIn) {
      throw new BadRequestException('Cannot cancel after check-in');
    }

    const wasConfirmed = signupStatus(signups[idx]) === 'confirmed';
    const removedWaitlistPosition = signups[idx].waitlistPosition;
    signups.splice(idx, 1);

    if (wasConfirmed) {
      const waitlist = waitlistedSignups(signups);
      if (waitlist.length > 0) {
        const promoted = waitlist[0];
        const promotedIdx = signups.findIndex((s) => s.userId === promoted.userId);
        signups[promotedIdx] = {
          ...signups[promotedIdx],
          status: 'confirmed',
          waitlistPosition: undefined,
        };
        for (const [i, s] of signups.entries()) {
          if (signupStatus(s) === 'waitlisted' && s.waitlistPosition) {
            signups[i] = { ...s, waitlistPosition: s.waitlistPosition - 1 };
          }
        }

        this.notifications.createInApp(
          tenantId,
          promoted.userId,
          'volunteer_waitlist_promoted',
          `Spot opened — ${shift.title}`,
          `A spot opened for ${shift.title} on ${shift.date}. You are now confirmed!`,
          { shiftId },
        );
      }
    } else if (removedWaitlistPosition) {
      for (const [i, s] of signups.entries()) {
        if (
          signupStatus(s) === 'waitlisted' &&
          s.waitlistPosition &&
          s.waitlistPosition > removedWaitlistPosition
        ) {
          signups[i] = { ...s, waitlistPosition: s.waitlistPosition - 1 };
        }
      }
    }

    return this.saveShift(tenantId, shiftId, signups);
  }

  async checkin(tenantId: string, shiftId: string, user: AuthUser): Promise<VolunteerShift> {
    const shift = await this.getShiftRecord(tenantId, shiftId);
    const signups = [...shift.signups];
    const idx = signups.findIndex((s) => s.userId === user.id);

    if (idx === -1) {
      throw new BadRequestException('You are not signed up for this shift');
    }
    if (signupStatus(signups[idx]) === 'waitlisted') {
      throw new BadRequestException('Waitlisted volunteers cannot check in until promoted');
    }
    if (signups[idx].checkedIn) {
      throw new ConflictException('Already checked in for this shift');
    }

    signups[idx] = {
      ...signups[idx],
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
    };

    return this.saveShift(tenantId, shiftId, signups);
  }

  async checkout(tenantId: string, shiftId: string, user: AuthUser): Promise<VolunteerShift> {
    const nowIso = new Date().toISOString();
    const shift = await this.getShiftRecord(tenantId, shiftId);
    const signups = [...shift.signups];
    const idx = signups.findIndex((s) => s.userId === user.id);

    if (idx === -1) {
      throw new BadRequestException('You are not signed up for this shift');
    }
    if (!signups[idx].checkedIn || !signups[idx].checkedInAt) {
      throw new BadRequestException('Check in before checking out');
    }
    if (signups[idx].checkedOut) {
      throw new ConflictException('Already checked out for this shift');
    }

    const hoursLogged = hoursBetween(signups[idx].checkedInAt!, nowIso);
    signups[idx] = {
      ...signups[idx],
      checkedOut: true,
      checkedOutAt: nowIso,
      hoursLogged,
    };

    return this.saveShift(tenantId, shiftId, signups);
  }

  async getStats(tenantId: string, user: AuthUser): Promise<VolunteerStats> {
    const shifts = await this.loadShifts(tenantId);
    const now = new Date();

    let hoursThisQuarter = 0;
    let hoursYtd = 0;
    let upcomingShifts = 0;
    let completedShifts = 0;
    let waitlistedShifts = 0;

    for (const shift of shifts) {
      const signup = shift.signups.find((s) => s.userId === user.id);
      if (!signup) continue;

      if (signupStatus(signup) === 'waitlisted' && !isShiftPast(shift, now)) {
        waitlistedShifts += 1;
        continue;
      }

      if (signup.checkedOut && signup.hoursLogged != null && signup.checkedOutAt) {
        if (isInYear(signup.checkedOutAt, now)) {
          hoursYtd += signup.hoursLogged;
        }
        if (isInQuarter(signup.checkedOutAt, now)) {
          hoursThisQuarter += signup.hoursLogged;
        }
        completedShifts += 1;
      } else if (!isShiftPast(shift, now) && signupStatus(signup) === 'confirmed') {
        upcomingShifts += 1;
      }
    }

    hoursThisQuarter = Math.round(hoursThisQuarter * 10) / 10;
    hoursYtd = Math.round(hoursYtd * 10) / 10;

    const badgeTier = computeBadgeTier(hoursThisQuarter);
    const nextAt = nextBadgeAtHours(badgeTier);

    return {
      hoursThisQuarter,
      hoursYtd,
      upcomingShifts,
      completedShifts,
      waitlistedShifts,
      badgeTier,
      nextBadgeAtHours: nextAt,
      progressToNextBadge: progressToNextBadge(hoursThisQuarter, badgeTier),
    };
  }

  async listCertificates(
    tenantId: string,
    user: AuthUser,
  ): Promise<{ data: VolunteerCertificate[] }> {
    const data = await this.buildCertificates(tenantId, user);
    return { data };
  }

  async getCertificate(
    tenantId: string,
    user: AuthUser,
    certId: string,
  ): Promise<VolunteerCertificate> {
    const certs = await this.buildCertificates(tenantId, user);
    const cert = certs.find((c) => c.id === certId);
    if (!cert) {
      throw new NotFoundException(`Certificate ${certId} not found`);
    }
    return cert;
  }

  private async buildCertificates(
    tenantId: string,
    user: AuthUser,
  ): Promise<VolunteerCertificate[]> {
    const branding = getTenantBranding(tenantId);
    const stats = await this.getStats(tenantId, user);
    const shifts = await this.loadShifts(tenantId);
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const quarterLabel = `${year} Q${quarter}`;
    const issuedAt = now.toISOString();
    const certs: VolunteerCertificate[] = [];

    const base = {
      volunteerName: user.name,
      issuedAt,
      templeName: branding.name,
      deity: branding.deity,
      location: branding.location,
    };

    const certNo = (suffix: string) =>
      `VC-${year}-${user.id.slice(-4).toUpperCase()}-${suffix}`;

    if (stats.hoursYtd > 0) {
      certs.push({
        id: `hours-ytd-${year}`,
        kind: 'hours_ytd',
        title: `${year} Seva Hours`,
        subtitle: `${stats.completedShifts} completed shifts`,
        certificateNumber: certNo('YTD'),
        hours: stats.hoursYtd,
        periodLabel: String(year),
        ...base,
      });
    }

    if (stats.hoursThisQuarter > 0) {
      certs.push({
        id: `hours-quarter-${year}-q${quarter}`,
        kind: 'hours_quarter',
        title: `${quarterLabel} Seva`,
        subtitle: 'Quarterly seva recognition',
        certificateNumber: certNo(`Q${quarter}`),
        hours: stats.hoursThisQuarter,
        periodLabel: quarterLabel,
        ...base,
      });
    }

    if (stats.completedShifts > 0) {
      const badgeLabels = {
        bronze: 'Bronze',
        silver: 'Silver',
        gold: 'Gold',
        platinum: 'Platinum',
      } as const;
      certs.push({
        id: `badge-${stats.badgeTier}`,
        kind: 'badge_tier',
        title: `${badgeLabels[stats.badgeTier]} Seva Badge`,
        subtitle: `${stats.hoursThisQuarter} hours this quarter`,
        certificateNumber: certNo(stats.badgeTier.toUpperCase()),
        badgeTier: stats.badgeTier,
        hours: stats.hoursThisQuarter,
        ...base,
      });

      certs.push({
        id: 'seva-appreciation',
        kind: 'seva_appreciation',
        title: 'Seva Appreciation',
        subtitle: 'Thank you for your dedicated service',
        certificateNumber: certNo('THANK'),
        hours: stats.hoursYtd,
        ...base,
      });
    }

    for (const shift of shifts) {
      const signup = shift.signups.find((s) => s.userId === user.id);
      if (!signup?.checkedOut || signup.hoursLogged == null) continue;

      certs.push({
        ...base,
        id: `shift-${shift.id}`,
        kind: 'shift_completion',
        title: shift.title,
        subtitle: shift.eventName ?? shift.location ?? 'Temple seva',
        certificateNumber: certNo(shift.id.slice(-6).toUpperCase()),
        hours: signup.hoursLogged,
        shiftTitle: shift.title,
        shiftDate: shift.date,
        eventName: shift.eventName,
        issuedAt: signup.checkedOutAt ?? issuedAt,
      });
    }

    const eventHours = new Map<string, { name: string; hours: number; latest: string }>();
    for (const shift of shifts) {
      if (!shift.eventId) continue;
      const signup = shift.signups.find((s) => s.userId === user.id);
      if (!signup?.checkedOut || signup.hoursLogged == null) continue;

      const existing = eventHours.get(shift.eventId) ?? {
        name: shift.eventName ?? shift.title,
        hours: 0,
        latest: signup.checkedOutAt ?? issuedAt,
      };
      existing.hours += signup.hoursLogged;
      if ((signup.checkedOutAt ?? '') > existing.latest) {
        existing.latest = signup.checkedOutAt ?? issuedAt;
      }
      eventHours.set(shift.eventId, existing);
    }

    for (const [eventId, agg] of eventHours) {
      if (agg.hours <= 0) continue;
      certs.push({
        ...base,
        id: `event-${eventId}`,
        kind: 'event_participation',
        title: `${agg.name} — Event Seva`,
        subtitle: 'Event participation certificate',
        certificateNumber: certNo(eventId.slice(-6).toUpperCase()),
        hours: Math.round(agg.hours * 10) / 10,
        eventName: agg.name,
        issuedAt: agg.latest,
      });
    }

    return certs.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  getPreferences(tenantId: string, userId: string): VolunteerPreferences {
    const key = `${tenantId}:${userId}`;
    return (
      this.preferencesStore.get(key) ?? {
        userId,
        categories: ['festival', 'annadanam'],
        roles: ['kitchen', 'setup'],
        notifyNewOpportunities: true,
      }
    );
  }

  updatePreferences(
    tenantId: string,
    userId: string,
    patch: Partial<Omit<VolunteerPreferences, 'userId'>>,
  ): VolunteerPreferences {
    const current = this.getPreferences(tenantId, userId);
    const updated = { ...current, ...patch, userId };
    this.preferencesStore.set(`${tenantId}:${userId}`, updated);
    return updated;
  }

  private async loadShifts(tenantId: string): Promise<VolunteerShift[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.volunteerShifts();
      const rows = await repo.find({ order: { date: 'ASC', startTime: 'ASC' } });
      return rows.map((row) => this.toShift(row));
    }

    this.seedDemoShifts(tenantId);
    return this.scoped(tenantId).map(
      ({ tenantId: _t, createdAt: _c, updatedAt: _u, ...shift }) => shift,
    );
  }

  private async getShiftRecord(tenantId: string, shiftId: string): Promise<VolunteerShiftRecord> {
    if (this.usePostgres) {
      const repo = await this.tenantData.volunteerShifts();
      const row = await repo.findOne({ where: { id: shiftId } });
      if (!row) throw new NotFoundException(`Shift ${shiftId} not found`);
      return { ...this.toShift(row), tenantId, createdAt: row.createdAt, updatedAt: row.updatedAt };
    }

    this.seedDemoShifts(tenantId);
    const existing = this.findOneScoped(tenantId, shiftId);
    if (!existing) throw new NotFoundException(`Shift ${shiftId} not found`);
    return existing;
  }

  private async saveShift(
    tenantId: string,
    shiftId: string,
    signups: VolunteerSignup[],
  ): Promise<VolunteerShift> {
    if (this.usePostgres) {
      const repo = await this.tenantData.volunteerShifts();
      const row = await repo.findOne({ where: { id: shiftId } });
      if (!row) throw new NotFoundException(`Shift ${shiftId} not found`);
      row.signups = signups;
      const saved = await repo.save(row);
      return this.toShift(saved);
    }

    const updated = this.updateEntity(tenantId, shiftId, { signups });
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...shift } = updated;
    return shift;
  }

  private async loadActiveEvents(tenantId: string): Promise<TempleEvent[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.events();
      const rows = await repo.find();
      return rows
        .map((r) => this.toEvent(r))
        .filter(
          (e) =>
            e.stage === EventLifecycleStage.CONFIRMED ||
            e.stage === EventLifecycleStage.IN_PROGRESS,
        );
    }

    return this.loadMemoryEvents(tenantId).filter(
      (e) =>
        e.stage === EventLifecycleStage.CONFIRMED ||
        e.stage === EventLifecycleStage.IN_PROGRESS,
    );
  }

  private async loadEvent(tenantId: string, eventId: string): Promise<TempleEvent> {
    if (this.usePostgres) {
      const repo = await this.tenantData.events();
      const row = await repo.findOne({ where: { id: eventId } });
      if (!row) throw new NotFoundException(`Event ${eventId} not found`);
      return this.toEvent(row);
    }

    const event = this.loadMemoryEvents(tenantId).find((e) => e.id === eventId);
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);
    return event;
  }

  private loadMemoryEvents(tenantId: string): TempleEvent[] {
    void tenantId;
    const now = new Date();
    return [
      {
        id: DEMO_EVENT_IDS.brahmotsavam,
        tenantId: DEMO_TENANT,
        name: 'Brahmotsavam 2026',
        type: 'festival',
        stage: EventLifecycleStage.CONFIRMED,
        startDate: new Date('2026-06-08'),
        endDate: new Date('2026-06-15'),
        venues: ['Main Hall', 'Kalyana Mandapam', 'Open Ground'],
        expectedFootfall: 4200,
        volunteerCategory: 'festival',
        volunteersNeeded: 36,
        volunteerRoles: [
          { role: 'setup', slotsNeeded: 10, description: 'Festival setup' },
          { role: 'kitchen', slotsNeeded: 8, description: 'Annadanam service' },
          { role: 'parking', slotsNeeded: 8, description: 'Parking & queue' },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: DEMO_EVENT_IDS.navaratri,
        tenantId: DEMO_TENANT,
        name: 'Navaratri 2026',
        type: 'festival',
        stage: EventLifecycleStage.CONFIRMED,
        startDate: new Date('2026-09-20'),
        endDate: new Date('2026-09-28'),
        venues: ['Main Hall', 'Open Ground'],
        expectedFootfall: 2500,
        volunteerCategory: 'setup',
        volunteersNeeded: 14,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: DEMO_EVENT_IDS.shivaratri,
        tenantId: DEMO_TENANT,
        name: 'Maha Shivaratri 2026',
        type: 'festival',
        stage: EventLifecycleStage.CONFIRMED,
        startDate: new Date('2026-02-26'),
        endDate: new Date('2026-02-27'),
        venues: ['Shiva Sannidhi'],
        volunteerCategory: 'pooja',
        volunteersNeeded: 12,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: DEMO_EVENT_IDS.sundayAnnadanam,
        tenantId: DEMO_TENANT,
        name: 'Sunday Annadanam',
        type: 'community',
        stage: EventLifecycleStage.IN_PROGRESS,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        venues: ['Community Kitchen', 'Dining Hall'],
        volunteerCategory: 'annadanam',
        volunteersNeeded: 14,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  private aggregateRoles(shifts: VolunteerShift[]): VolunteerRoleNeed[] {
    const map = new Map<VolunteerShiftRole, number>();
    for (const shift of shifts) {
      if (!shift.role) continue;
      map.set(shift.role, (map.get(shift.role) ?? 0) + shift.slots);
    }
    return [...map.entries()].map(([role, slotsNeeded]) => ({ role, slotsNeeded }));
  }

  private toEvent(row: import('../../database/entities/tenant/temple-event.entity').TempleEventEntity): TempleEvent {
    return {
      id: row.id,
      tenantId: DEMO_TENANT,
      name: row.name,
      type: row.type as TempleEvent['type'],
      stage: row.stage as EventLifecycleStage,
      startDate: row.startDate,
      endDate: row.endDate,
      venues: row.venues,
      expectedFootfall: row.expectedFootfall,
      volunteerCategory: row.volunteerCategory as VolunteerCategory | undefined,
      volunteersNeeded: row.volunteersNeeded ?? undefined,
      volunteerRoles: row.volunteerRoles as VolunteerRoleNeed[] | undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private shiftInputToRowFields(input: CreateVolunteerShiftInput) {
    return {
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      slots: input.slots,
      description: input.description,
      location: input.location,
      role: input.role,
      eventId: input.eventId,
      eventName: input.eventName,
      coordinator: input.coordinator,
      category: input.category,
      isRecurringTemplate: input.isRecurringTemplate ?? false,
      templateKey: input.templateKey,
    };
  }

  private shiftInputToEntityFields(input: CreateVolunteerShiftInput) {
    return {
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      slots: input.slots,
      ...(input.description ? { description: input.description } : {}),
      ...(input.location ? { location: input.location } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.eventId ? { eventId: input.eventId } : {}),
      ...(input.eventName ? { eventName: input.eventName } : {}),
      ...(input.coordinator ? { coordinator: input.coordinator } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.isRecurringTemplate ? { isRecurringTemplate: input.isRecurringTemplate } : {}),
      ...(input.templateKey ? { templateKey: input.templateKey } : {}),
    };
  }

  private newSignup(user: AuthUser): VolunteerSignup {
    return {
      userId: user.id,
      userName: user.name,
      signedUpAt: new Date().toISOString(),
      checkedIn: false,
    };
  }

  private toShift(row: VolunteerShiftEntity): VolunteerShift {
    return {
      id: row.id,
      title: row.title,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      slots: row.slots,
      signups: row.signups ?? [],
      ...(row.description ? { description: row.description } : {}),
      ...(row.location ? { location: row.location } : {}),
      ...(row.role ? { role: row.role as VolunteerShift['role'] } : {}),
      ...(row.eventId ? { eventId: row.eventId } : {}),
      ...(row.eventName ? { eventName: row.eventName } : {}),
      ...(row.coordinator ? { coordinator: row.coordinator } : {}),
      ...(row.category ? { category: row.category as VolunteerShift['category'] } : {}),
      ...(row.isRecurringTemplate ? { isRecurringTemplate: row.isRecurringTemplate } : {}),
      ...(row.templateKey ? { templateKey: row.templateKey } : {}),
    };
  }
}
