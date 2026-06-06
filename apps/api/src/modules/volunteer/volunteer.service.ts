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
  VolunteerShift,
  VolunteerSignup,
} from '@tms/types';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { VolunteerShiftEntity } from '../../database/entities/tenant/volunteer-shift.entity';
import { TenantDataService } from '../../database/tenant-data.service';

type VolunteerShiftRecord = VolunteerShift & TenantEntity;

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class VolunteerService
  extends BaseTenantService<VolunteerShiftRecord>
  implements OnModuleInit
{
  protected store = new Map<string, VolunteerShiftRecord>();

  constructor(private readonly tenantData: TenantDataService) {
    super();
  }

  private get usePostgres(): boolean {
    return this.tenantData.enabled;
  }

  onModuleInit(): void {
    if (!this.usePostgres) {
      this.seedDemoShifts(DEMO_TENANT);
    }
  }

  private seedDemoShifts(tenantId: string): void {
    if (this.scoped(tenantId).length > 0) return;

    const now = new Date();
    const shifts: Array<Omit<VolunteerShiftRecord, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'vol-shift-001',
        tenantId,
        title: 'Brahmotsavam Setup',
        date: '2026-06-08',
        startTime: '09:00',
        endTime: '13:00',
        slots: 10,
        signups: [
          {
            userId: 'user-volunteer-001',
            userName: 'Volunteer Priya',
            signedUpAt: now.toISOString(),
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
        signups: [
          {
            userId: 'user-volunteer-001',
            userName: 'Volunteer Priya',
            signedUpAt: now.toISOString(),
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
        signups: [],
      },
    ];

    for (const shift of shifts) {
      this.store.set(shift.id, { ...shift, createdAt: now, updatedAt: now });
    }
  }

  async findAll(tenantId: string): Promise<VolunteerShift[]> {
    if (this.usePostgres) {
      const repo = await this.tenantData.volunteerShifts();
      const rows = await repo.find({ order: { date: 'ASC', startTime: 'ASC' } });
      return rows.map((row) => this.toShift(row));
    }

    this.seedDemoShifts(tenantId);
    return this.scoped(tenantId)
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
      .map(({ tenantId: _t, createdAt: _c, updatedAt: _u, ...shift }) => shift);
  }

  async create(tenantId: string, input: CreateVolunteerShiftInput): Promise<VolunteerShift> {
    if (this.usePostgres) {
      const repo = await this.tenantData.volunteerShifts();
      const saved = await repo.save(
        repo.create({
          title: input.title,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          slots: input.slots,
          signups: [],
        }),
      );
      return this.toShift(saved);
    }

    this.seedDemoShifts(tenantId);
    const record = this.createEntity(tenantId, {
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      slots: input.slots,
      signups: [],
    });
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...shift } = record;
    return shift;
  }

  async signup(tenantId: string, shiftId: string, user: AuthUser): Promise<VolunteerShift> {
    if (this.usePostgres) {
      const repo = await this.tenantData.volunteerShifts();
      const row = await repo.findOne({ where: { id: shiftId } });
      if (!row) throw new NotFoundException(`Shift ${shiftId} not found`);

      const signups = [...(row.signups ?? [])];
      if (signups.some((s) => s.userId === user.id)) {
        throw new ConflictException('Already signed up for this shift');
      }
      if (signups.length >= row.slots) {
        throw new BadRequestException('No slots available for this shift');
      }

      signups.push(this.newSignup(user));
      row.signups = signups;
      const saved = await repo.save(row);
      return this.toShift(saved);
    }

    this.seedDemoShifts(tenantId);
    const existing = this.findOneScoped(tenantId, shiftId);
    if (!existing) throw new NotFoundException(`Shift ${shiftId} not found`);

    if (existing.signups.some((s: VolunteerSignup) => s.userId === user.id)) {
      throw new ConflictException('Already signed up for this shift');
    }
    if (existing.signups.length >= existing.slots) {
      throw new BadRequestException('No slots available for this shift');
    }

    const updated = this.updateEntity(tenantId, shiftId, {
      signups: [...existing.signups, this.newSignup(user)],
    });
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...shift } = updated;
    return shift;
  }

  async checkin(tenantId: string, shiftId: string, user: AuthUser): Promise<VolunteerShift> {
    if (this.usePostgres) {
      const repo = await this.tenantData.volunteerShifts();
      const row = await repo.findOne({ where: { id: shiftId } });
      if (!row) throw new NotFoundException(`Shift ${shiftId} not found`);

      const signups = [...(row.signups ?? [])];
      const idx = signups.findIndex((s) => s.userId === user.id);
      if (idx === -1) {
        throw new BadRequestException('You are not signed up for this shift');
      }
      if (signups[idx].checkedIn) {
        throw new ConflictException('Already checked in for this shift');
      }

      signups[idx] = {
        ...signups[idx],
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
      };
      row.signups = signups;
      const saved = await repo.save(row);
      return this.toShift(saved);
    }

    this.seedDemoShifts(tenantId);
    const existing = this.findOneScoped(tenantId, shiftId);
    if (!existing) throw new NotFoundException(`Shift ${shiftId} not found`);

    const idx = existing.signups.findIndex((s: VolunteerSignup) => s.userId === user.id);
    if (idx === -1) {
      throw new BadRequestException('You are not signed up for this shift');
    }
    if (existing.signups[idx].checkedIn) {
      throw new ConflictException('Already checked in for this shift');
    }

    const signups = [...existing.signups];
    signups[idx] = {
      ...signups[idx],
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
    };

    const updated = this.updateEntity(tenantId, shiftId, { signups });
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...shift } = updated;
    return shift;
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
    };
  }
}
