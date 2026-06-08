import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  AuthUser,
  Committee,
  CommitteeCalendarBlock,
  CommitteeCalendarBlockType,
  CommitteeCategory,
  CommitteeDashboard,
  CommitteeLeadershipRecord,
  CommitteeMember,
  getPersonAvatarUrl,
  CommitteeMessage,
  CommitteeReport,
  CommitteeRequest,
  CommitteeRoster,
  CommitteeTarget,
  CommitteeTask,
  CreateCommitteeCalendarBlockInput,
  CreateCommitteeInput,
  CreateCommitteeMemberInput,
  CreateCommitteeMessageInput,
  CreateCommitteeReportInput,
  CreateCommitteeRequestInput,
  CreateCommitteeTargetInput,
  CreateCommitteeTaskInput,
  GANESHA_TEMPLE_ID,
  SV_TEMPLE_ID,
  UpdateCommitteeCalendarBlockInput,
  UpdateCommitteeInput,
  UpdateCommitteeMemberInput,
  UpdateCommitteeRequestInput,
  UpdateCommitteeTargetInput,
  UpdateCommitteeTaskInput,
  UserRole,
} from '@tms/types';
import { v4 as uuidv4 } from 'uuid';
import {
  COMMITTEE_CATEGORY_LABELS,
  COMMITTEE_CATEGORY_ORDER,
  COMMITTEE_SEED_VERSION,
  committeeIdFor,
  getCommitteeSeedsForTenant,
  parseMember,
} from '../../data/committee-seed-data';
import { lookupGaneshaCommitteePhoto } from '../../data/committee-photo-map';
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantDataService } from '../../database/tenant-data.service';
import { NotificationsService } from '../notifications/notifications.service';

type CommitteeRecord = TenantEntity & {
  name: string;
  slug: string;
  description?: string;
  purpose?: string;
  category: CommitteeCategory;
  committeeType: Committee['committeeType'];
  meetingCadence?: Committee['meetingCadence'];
  publicRoster: boolean;
  isActive: boolean;
  seedVersion?: string;
};

type MemberRecord = TenantEntity & {
  committeeId: string;
  userId: string;
  name: string;
  email?: string;
  role: CommitteeMember['role'];
  displayTitle?: string;
  photoUrl?: string;
  joinedAt: string;
  isActive: boolean;
};

type ReportRecord = TenantEntity &
  Omit<CommitteeReport, 'createdAt' | 'updatedAt'>;

type LeadershipRecord = TenantEntity & CommitteeLeadershipRecord;

type BlockRecord = TenantEntity & Omit<CommitteeCalendarBlock, 'createdAt' | 'updatedAt'>;
type TaskRecord = TenantEntity & Omit<CommitteeTask, 'createdAt' | 'updatedAt'>;
type TargetRecord = TenantEntity & Omit<CommitteeTarget, 'createdAt' | 'updatedAt'>;
type RequestRecord = TenantEntity &
  Omit<CommitteeRequest, 'createdAt' | 'updatedAt' | 'reviewedAt'> & {
    reviewedAt?: Date;
  };
type MessageRecord = TenantEntity & {
  committeeId: string;
  authorUserId: string;
  authorName?: string;
  subject?: string;
  body: string;
  isAnnouncement: boolean;
};

@Injectable()
export class CommitteeService extends BaseTenantService<CommitteeRecord> implements OnModuleInit {
  protected store = new Map<string, CommitteeRecord>();
  private memberStore = new Map<string, MemberRecord>();
  private blockStore = new Map<string, BlockRecord>();
  private taskStore = new Map<string, TaskRecord>();
  private targetStore = new Map<string, TargetRecord>();
  private requestStore = new Map<string, RequestRecord>();
  private messageStore = new Map<string, MessageRecord>();
  private reportStore = new Map<string, ReportRecord>();
  private leadershipStore = new Map<string, LeadershipRecord>();
  private tenantSeedVersions = new Map<string, string>();

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
      this.seedDemoCommittees(SV_TEMPLE_ID);
      this.seedDemoCommittees(GANESHA_TEMPLE_ID);
    }
  }

  private iso(d: Date): string {
    return d.toISOString();
  }

  private toCommittee(record: CommitteeRecord, viewerUserId?: string): Committee {
    const memberCount = [...this.memberStore.values()].filter(
      (m) => m.tenantId === record.tenantId && m.committeeId === record.id && m.isActive,
    ).length;
    const viewerMember = viewerUserId
      ? [...this.memberStore.values()].find(
          (m) =>
            m.tenantId === record.tenantId &&
            m.committeeId === record.id &&
            m.userId === viewerUserId &&
            m.isActive,
        )
      : undefined;
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description,
      purpose: record.purpose,
      category: record.category,
      committeeType: record.committeeType,
      meetingCadence: record.meetingCadence,
      publicRoster: record.publicRoster,
      isActive: record.isActive,
      memberCount,
      myRole: viewerMember?.role,
      myDisplayTitle: viewerMember?.displayTitle,
      createdAt: this.iso(record.createdAt),
      updatedAt: this.iso(record.updatedAt),
    };
  }

  private async resolveMyCommitteeIds(
    tenantId: string,
    user: AuthUser,
    committeeId?: string,
  ): Promise<string[]> {
    const committees = await this.findAll(tenantId, user, { mine: true });
    if (committeeId) {
      return committees.some((c) => c.id === committeeId) ? [committeeId] : [];
    }
    return committees.map((c) => c.id);
  }

  private toReport(record: ReportRecord): CommitteeReport {
    const { tenantId: _t, createdAt, updatedAt, ...r } = record;
    return { ...r, createdAt: this.iso(createdAt), updatedAt: this.iso(updatedAt) };
  }

  private toLeadership(record: LeadershipRecord): CommitteeLeadershipRecord {
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...l } = record;
    return l;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private toMember(record: MemberRecord): CommitteeMember {
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...m } = record;
    return {
      ...m,
      photoUrl: getPersonAvatarUrl(m.name, m.photoUrl),
    };
  }

  private resolveBlockType(record: BlockRecord): CommitteeCalendarBlockType {
    if (record.blockType) return record.blockType;
    return record.blocksTempleCalendar ? 'temple' : 'committee';
  }

  private toBlock(record: BlockRecord): CommitteeCalendarBlock {
    const { tenantId: _t, createdAt, updatedAt, blockType: _bt, ...b } = record;
    return {
      ...b,
      blockType: this.resolveBlockType(record),
      createdAt: this.iso(createdAt),
      updatedAt: this.iso(updatedAt),
    };
  }

  private toTask(record: TaskRecord): CommitteeTask {
    const { tenantId: _t, createdAt, updatedAt, ...t } = record;
    return { ...t, createdAt: this.iso(createdAt), updatedAt: this.iso(updatedAt) };
  }

  private toTarget(record: TargetRecord): CommitteeTarget {
    const { tenantId: _t, createdAt, updatedAt, ...t } = record;
    return { ...t, createdAt: this.iso(createdAt), updatedAt: this.iso(updatedAt) };
  }

  private toRequest(record: RequestRecord): CommitteeRequest {
    const { tenantId: _t, createdAt, updatedAt, reviewedAt, ...r } = record;
    return {
      ...r,
      createdAt: this.iso(createdAt),
      updatedAt: this.iso(updatedAt),
      reviewedAt: reviewedAt ? this.iso(reviewedAt) : undefined,
    };
  }

  private toMessage(record: MessageRecord): CommitteeMessage {
    const { tenantId: _t, createdAt, updatedAt: _u, ...m } = record;
    return { ...m, createdAt: this.iso(createdAt) };
  }

  private clearTenantCommitteeData(tenantId: string): void {
    const committeeIds = new Set(
      [...this.store.values()].filter((c) => c.tenantId === tenantId).map((c) => c.id),
    );
    for (const id of committeeIds) {
      this.store.delete(id);
    }
    for (const [key, value] of this.memberStore) {
      if (value.tenantId === tenantId) this.memberStore.delete(key);
    }
    for (const [key, value] of this.blockStore) {
      if (value.tenantId === tenantId) this.blockStore.delete(key);
    }
    for (const [key, value] of this.taskStore) {
      if (value.tenantId === tenantId) this.taskStore.delete(key);
    }
    for (const [key, value] of this.targetStore) {
      if (value.tenantId === tenantId) this.targetStore.delete(key);
    }
    for (const [key, value] of this.requestStore) {
      if (value.tenantId === tenantId) this.requestStore.delete(key);
    }
    for (const [key, value] of this.messageStore) {
      if (value.tenantId === tenantId) this.messageStore.delete(key);
    }
    for (const [key, value] of this.reportStore) {
      if (value.tenantId === tenantId) this.reportStore.delete(key);
    }
    for (const [key, value] of this.leadershipStore) {
      if (value.tenantId === tenantId) this.leadershipStore.delete(key);
    }
  }

  private seedDemoCommittees(tenantId: string): void {
    const seeds = getCommitteeSeedsForTenant(tenantId);
    if (seeds.length === 0) return;

    if (this.tenantSeedVersions.get(tenantId) === COMMITTEE_SEED_VERSION) {
      return;
    }

    this.clearTenantCommitteeData(tenantId);

    const now = new Date();
    const isSv = tenantId === SV_TEMPLE_ID;
    const isGanesha = tenantId === GANESHA_TEMPLE_ID;
    const committeeUserId = isSv ? 'user-committee-001' : 'user-ganesha-committee-001';
    const adminUserId = isSv ? 'user-admin-001' : 'user-ganesha-admin-001';
    const primarySlug = isGanesha ? 'executive' : 'governance';
    const primaryCommitteeId = committeeIdFor(tenantId, primarySlug);

    for (const def of seeds) {
      const committeeId = committeeIdFor(tenantId, def.slug);
      this.store.set(committeeId, {
        id: committeeId,
        tenantId,
        name: def.name,
        slug: def.slug,
        description: def.description,
        purpose: def.purpose,
        category: def.category,
        committeeType: def.committeeType,
        meetingCadence: def.meetingCadence,
        publicRoster: def.publicRoster,
        isActive: true,
        seedVersion: COMMITTEE_SEED_VERSION,
        createdAt: now,
        updatedAt: now,
      });

      const nameCounts = new Map<string, number>();
      def.members.forEach((raw, index) => {
        const parsed = parseMember(raw);
        const count = (nameCounts.get(parsed.name) ?? 0) + 1;
        nameCounts.set(parsed.name, count);
        const suffix = count > 1 ? `-${count}` : '';
        const isSvDemoMember = isSv && def.slug === primarySlug && parsed.name === 'Committee Member Raj';

        const memberId = `${committeeId}-member-${index}`;
        this.memberStore.set(memberId, {
          id: memberId,
          tenantId,
          committeeId,
          userId: isSvDemoMember
            ? committeeUserId
            : `roster-${def.slug}-${this.slugify(parsed.name)}${suffix}`,
          name: parsed.name,
          email: isSvDemoMember ? 'committee@svtemple.org' : undefined,
          role: parsed.role,
          displayTitle: parsed.displayTitle,
          photoUrl: isGanesha ? lookupGaneshaCommitteePhoto(parsed.name) : undefined,
          joinedAt: this.iso(now),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      });

      if (def.slug === primarySlug && isGanesha) {
        this.memberStore.set(`${committeeId}-member-demo-user`, {
          id: `${committeeId}-member-demo-user`,
          tenantId,
          committeeId,
          userId: committeeUserId,
          name: 'Committee Member Priya',
          email: 'committee@sgtemple.org',
          role: 'member',
          joinedAt: this.iso(now),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    this.taskStore.set(`${primaryCommitteeId}-task-001`, {
      id: `${primaryCommitteeId}-task-001`,
      tenantId,
      committeeId: primaryCommitteeId,
      title: 'Review annual budget proposal',
      description: 'Prepare recommendations for the upcoming fiscal year budget.',
      assigneeUserId: committeeUserId,
      assigneeName: isSv ? 'Committee Member Raj' : 'Committee Member Priya',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().slice(0, 10),
      createdByUserId: adminUserId,
      createdAt: now,
      updatedAt: now,
    });

    this.targetStore.set(`${primaryCommitteeId}-target-001`, {
      id: `${primaryCommitteeId}-target-001`,
      tenantId,
      committeeId: primaryCommitteeId,
      title: 'Community outreach events',
      description: 'Number of outreach events hosted per quarter',
      period: 'quarterly',
      targetValue: 4,
      currentValue: 2,
      unit: 'events',
      dueDate: new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    });

    const year = now.getFullYear();
    const dateAt = (monthOffset: number, day: number) =>
      new Date(year, now.getMonth() + monthOffset, day).toISOString().slice(0, 10);

    this.blockStore.set(`${primaryCommitteeId}-block-001`, {
      id: `${primaryCommitteeId}-block-001`,
      tenantId,
      committeeId: primaryCommitteeId,
      title: 'Annual General Meeting',
      startDate: dateAt(2, 1),
      endDate: dateAt(2, 1),
      reason: 'Reserved for AGM and committee elections',
      blockType: 'temple',
      blocksTempleCalendar: true,
      createdByUserId: adminUserId,
      createdAt: now,
      updatedAt: now,
    });

    this.blockStore.set(`${primaryCommitteeId}-block-002`, {
      id: `${primaryCommitteeId}-block-002`,
      tenantId,
      committeeId: primaryCommitteeId,
      title: 'Quarterly board planning retreat',
      startDate: dateAt(4, 8),
      endDate: dateAt(4, 9),
      reason: 'Off-site planning for next fiscal year priorities',
      blockType: 'committee',
      blocksTempleCalendar: false,
      createdByUserId: adminUserId,
      createdAt: now,
      updatedAt: now,
    });

    this.blockStore.set(`${primaryCommitteeId}-block-personal-001`, {
      id: `${primaryCommitteeId}-block-personal-001`,
      tenantId,
      committeeId: primaryCommitteeId,
      title: 'Family travel — unavailable',
      startDate: dateAt(3, 18),
      endDate: dateAt(3, 22),
      reason: 'Out of town; limited email access',
      blockType: 'personal',
      blocksTempleCalendar: false,
      createdByUserId: committeeUserId,
      createdAt: now,
      updatedAt: now,
    });

    this.blockStore.set(`${primaryCommitteeId}-block-temple-002`, {
      id: `${primaryCommitteeId}-block-temple-002`,
      tenantId,
      committeeId: primaryCommitteeId,
      title: isGanesha ? 'Vinayaka Chaturthi festival week' : 'Major festival coordination',
      startDate: dateAt(5, 1),
      endDate: dateAt(5, 7),
      reason: 'Temple-wide event calendar hold for festival logistics',
      blockType: 'temple',
      blocksTempleCalendar: true,
      createdByUserId: adminUserId,
      createdAt: now,
      updatedAt: now,
    });

    this.messageStore.set(`${primaryCommitteeId}-msg-001`, {
      id: `${primaryCommitteeId}-msg-001`,
      tenantId,
      committeeId: primaryCommitteeId,
      authorUserId: adminUserId,
      authorName: isSv ? 'Temple Admin' : 'HCC Admin',
      subject: isGanesha
        ? 'Welcome to the Executive Committee'
        : 'Welcome to the governance committee',
      body: 'Please review the quarterly targets and submit any calendar block requests before month end.',
      isAnnouncement: true,
      createdAt: now,
      updatedAt: now,
    });

    const lastYear = now.getFullYear() - 1;
    this.leadershipStore.set(`${primaryCommitteeId}-lead-001`, {
      id: `${primaryCommitteeId}-lead-001`,
      tenantId,
      committeeId: primaryCommitteeId,
      name: isGanesha ? 'Arul Nayagadurai' : 'Former Chair Patel',
      role: 'chair',
      displayTitle: 'Chair',
      startDate: `${lastYear}-01-01`,
      endDate: `${lastYear}-12-31`,
      createdAt: now,
      updatedAt: now,
    });

    this.reportStore.set(`${primaryCommitteeId}-report-001`, {
      id: `${primaryCommitteeId}-report-001`,
      tenantId,
      committeeId: primaryCommitteeId,
      period: 'monthly',
      title: 'March Executive Meeting',
      meetingDate: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().slice(0, 10),
      minutesSummary:
        'Reviewed Q1 financials, approved campus maintenance budget, and discussed upcoming festival planning.',
      attendanceCount: 7,
      expectedAttendance: 9,
      createdByUserId: adminUserId,
      createdAt: now,
      updatedAt: now,
    });

    this.reportStore.set(`${primaryCommitteeId}-report-002`, {
      id: `${primaryCommitteeId}-report-002`,
      tenantId,
      committeeId: primaryCommitteeId,
      period: 'quarterly',
      title: 'Q1 Quarterly Review',
      meetingDate: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10),
      minutesSummary:
        'Quarterly KPI review: outreach events on track, IT migration timeline confirmed, nomination committee convened.',
      attendanceCount: 8,
      expectedAttendance: 9,
      createdByUserId: adminUserId,
      createdAt: now,
      updatedAt: now,
    });

    if (isGanesha) {
      const itCommitteeId = committeeIdFor(tenantId, 'it');
      const eduCommitteeId = committeeIdFor(tenantId, 'education');

      this.memberStore.set(`${itCommitteeId}-member-demo-user`, {
        id: `${itCommitteeId}-member-demo-user`,
        tenantId,
        committeeId: itCommitteeId,
        userId: committeeUserId,
        name: 'Committee Member Priya',
        email: 'committee@sgtemple.org',
        role: 'vice_chair',
        displayTitle: 'Co-Chair',
        joinedAt: this.iso(now),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      this.memberStore.set(`${eduCommitteeId}-member-demo-user`, {
        id: `${eduCommitteeId}-member-demo-user`,
        tenantId,
        committeeId: eduCommitteeId,
        userId: committeeUserId,
        name: 'Committee Member Priya',
        email: 'committee@sgtemple.org',
        role: 'member',
        joinedAt: this.iso(now),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      this.taskStore.set(`${itCommitteeId}-task-demo-001`, {
        id: `${itCommitteeId}-task-demo-001`,
        tenantId,
        committeeId: itCommitteeId,
        title: 'Upgrade temple Wi-Fi coverage',
        description: 'Survey dead zones and propose access-point placement for the community hall.',
        assigneeUserId: committeeUserId,
        assigneeName: 'Committee Member Priya',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 28).toISOString().slice(0, 10),
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      });

      this.taskStore.set(`${itCommitteeId}-task-open-001`, {
        id: `${itCommitteeId}-task-open-001`,
        tenantId,
        committeeId: itCommitteeId,
        title: 'Document AV setup for main hall',
        description: 'Inventory projectors, microphones, and HDMI routing for priest events.',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 21).toISOString().slice(0, 10),
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      });

      this.taskStore.set(`${itCommitteeId}-task-blocked-001`, {
        id: `${itCommitteeId}-task-blocked-001`,
        tenantId,
        committeeId: itCommitteeId,
        title: 'Website SSL certificate renewal',
        description: 'Vendor quote pending — blocked until finance approval.',
        assigneeUserId: committeeUserId,
        assigneeName: 'Committee Member Priya',
        status: 'blocked',
        priority: 'high',
        dueDate: new Date(now.getFullYear(), now.getMonth(), 30).toISOString().slice(0, 10),
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      });

      this.taskStore.set(`${eduCommitteeId}-task-demo-001`, {
        id: `${eduCommitteeId}-task-demo-001`,
        tenantId,
        committeeId: eduCommitteeId,
        title: 'Plan summer camp curriculum',
        description: 'Draft age-group sessions and volunteer staffing for July camp.',
        assigneeUserId: committeeUserId,
        assigneeName: 'Committee Member Priya',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(now.getFullYear(), now.getMonth(), 25).toISOString().slice(0, 10),
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      });

      this.taskStore.set(`${eduCommitteeId}-task-open-001`, {
        id: `${eduCommitteeId}-task-open-001`,
        tenantId,
        committeeId: eduCommitteeId,
        title: 'Recruit summer camp volunteers',
        description: 'Reach out to youth group parents and confirm volunteer shifts.',
        status: 'todo',
        priority: 'high',
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5).toISOString().slice(0, 10),
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      });

      this.blockStore.set(`${eduCommitteeId}-block-demo-001`, {
        id: `${eduCommitteeId}-block-demo-001`,
        tenantId,
        committeeId: eduCommitteeId,
        title: 'Summer camp registration week',
        startDate: dateAt(1, 10),
        endDate: dateAt(1, 14),
        reason: 'Education committee on-site registration and parent orientation',
        blockType: 'committee',
        blocksTempleCalendar: false,
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      });

      this.blockStore.set(`${itCommitteeId}-block-demo-001`, {
        id: `${itCommitteeId}-block-demo-001`,
        tenantId,
        committeeId: itCommitteeId,
        title: 'Network maintenance window',
        startDate: dateAt(0, 22),
        endDate: dateAt(0, 22),
        reason: 'After-hours firmware upgrade for community hall Wi-Fi',
        blockType: 'committee',
        blocksTempleCalendar: false,
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      });

      this.blockStore.set(`${itCommitteeId}-block-personal-001`, {
        id: `${itCommitteeId}-block-personal-001`,
        tenantId,
        committeeId: itCommitteeId,
        title: 'Day job — on-site client visit',
        startDate: dateAt(1, 3),
        endDate: dateAt(1, 3),
        reason: 'Unavailable during business hours',
        blockType: 'personal',
        blocksTempleCalendar: false,
        createdByUserId: committeeUserId,
        createdAt: now,
        updatedAt: now,
      });

      this.blockStore.set(`${eduCommitteeId}-block-personal-001`, {
        id: `${eduCommitteeId}-block-personal-001`,
        tenantId,
        committeeId: eduCommitteeId,
        title: 'Volunteer training prep day',
        startDate: dateAt(2, 12),
        endDate: dateAt(2, 12),
        reason: 'Personal prep time before camp volunteer orientation',
        blockType: 'personal',
        blocksTempleCalendar: false,
        createdByUserId: committeeUserId,
        createdAt: now,
        updatedAt: now,
      });

      this.requestStore.set(`${itCommitteeId}-request-demo-001`, {
        id: `${itCommitteeId}-request-demo-001`,
        tenantId,
        committeeId: itCommitteeId,
        type: 'budget',
        title: 'Network hardware refresh quote',
        description: 'Approve vendor quote for six wireless access points and cabling.',
        status: 'pending',
        requestedByUserId: 'roster-it-manohar-gudivada',
        requestedByName: 'Manohar Gudivada',
        createdAt: now,
        updatedAt: now,
      });

      this.requestStore.set(`${itCommitteeId}-request-leave-001`, {
        id: `${itCommitteeId}-request-leave-001`,
        tenantId,
        committeeId: itCommitteeId,
        type: 'leave',
        title: 'Family event — out of town',
        description: 'Unavailable for committee meetings and on-call support.',
        status: 'pending',
        requestedByUserId: 'roster-it-manohar-gudivada',
        requestedByName: 'Manohar Gudivada',
        blockStartDate: dateAt(2, 10),
        blockEndDate: dateAt(2, 12),
        blockTitle: 'Leave — Manohar Gudivada',
        createdAt: now,
        updatedAt: now,
      });

      this.requestStore.set(`${eduCommitteeId}-request-leave-001`, {
        id: `${eduCommitteeId}-request-leave-001`,
        tenantId,
        committeeId: eduCommitteeId,
        type: 'leave',
        title: 'Summer travel — limited availability',
        description: 'Personal travel; will check email weekly.',
        status: 'pending',
        requestedByUserId: committeeUserId,
        requestedByName: isGanesha ? 'Committee Member Priya' : 'Committee Member Raj',
        blockStartDate: dateAt(3, 18),
        blockEndDate: dateAt(3, 22),
        blockTitle: 'Leave — Committee Member Priya',
        createdAt: now,
        updatedAt: now,
      });
    }

    if (isSv) {
      const financeCommitteeId = committeeIdFor(tenantId, 'finance');
      this.memberStore.set(`${financeCommitteeId}-member-demo-user`, {
        id: `${financeCommitteeId}-member-demo-user`,
        tenantId,
        committeeId: financeCommitteeId,
        userId: committeeUserId,
        name: 'Committee Member Raj',
        email: 'committee@svtemple.org',
        role: 'member',
        joinedAt: this.iso(now),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      this.taskStore.set(`${financeCommitteeId}-task-demo-001`, {
        id: `${financeCommitteeId}-task-demo-001`,
        tenantId,
        committeeId: financeCommitteeId,
        title: 'Reconcile Q2 donation batches',
        assigneeUserId: committeeUserId,
        assigneeName: 'Committee Member Raj',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5).toISOString().slice(0, 10),
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      });
    }

    this.tenantSeedVersions.set(tenantId, COMMITTEE_SEED_VERSION);
  }

  private isAdmin(user: AuthUser): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  }

  private getMemberRecord(
    tenantId: string,
    committeeId: string,
    userId: string,
  ): MemberRecord | undefined {
    return [...this.memberStore.values()].find(
      (m) =>
        m.tenantId === tenantId &&
        m.committeeId === committeeId &&
        m.userId === userId &&
        m.isActive,
    );
  }

  private isChair(tenantId: string, committeeId: string, userId: string): boolean {
    const member = this.getMemberRecord(tenantId, committeeId, userId);
    return member?.role === 'chair' || member?.role === 'vice_chair';
  }

  private isMember(tenantId: string, committeeId: string, userId: string): boolean {
    return !!this.getMemberRecord(tenantId, committeeId, userId);
  }

  /** Auth user id plus roster userIds linked by email (for task assignment matching). */
  private getUserAssigneeIds(tenantId: string, user: AuthUser): Set<string> {
    const ids = new Set<string>([user.id]);
    const email = user.email?.toLowerCase();
    if (!email) return ids;
    for (const m of this.memberStore.values()) {
      if (
        m.tenantId === tenantId &&
        m.isActive &&
        m.email?.toLowerCase() === email
      ) {
        ids.add(m.userId);
      }
    }
    return ids;
  }

  private isTaskAssignedToUser(
    task: Pick<CommitteeTask, 'assigneeUserId'>,
    tenantId: string,
    user: AuthUser,
  ): boolean {
    if (!task.assigneeUserId) return false;
    return this.getUserAssigneeIds(tenantId, user).has(task.assigneeUserId);
  }

  assertCommitteeAccess(
    tenantId: string,
    committeeId: string,
    user: AuthUser,
    requireChair = false,
  ): void {
    if (this.isAdmin(user)) return;
    if (user.role !== UserRole.COMMITTEE) {
      throw new ForbiddenException('Committee access required');
    }
    if (!this.isMember(tenantId, committeeId, user.id)) {
      throw new ForbiddenException('Not a member of this committee');
    }
    if (requireChair && !this.isChair(tenantId, committeeId, user.id)) {
      throw new ForbiddenException('Chair or vice-chair access required');
    }
  }

  private assertManageAccess(tenantId: string, committeeId: string, user: AuthUser): void {
    this.assertCommitteeAccess(tenantId, committeeId, user, true);
  }

  private ensureCommittee(tenantId: string, committeeId: string): CommitteeRecord {
    const committee = this.findOneScoped(tenantId, committeeId);
    if (!committee) {
      throw new NotFoundException(`Committee ${committeeId} not found`);
    }
    return committee;
  }

  async findAll(
    tenantId: string,
    user: AuthUser,
    options?: { mine?: boolean },
  ): Promise<Committee[]> {
    this.seedDemoCommittees(tenantId);
    let records = this.scoped(tenantId);

    if (!this.isAdmin(user) || options?.mine) {
      const myCommitteeIds = new Set(
        [...this.memberStore.values()]
          .filter((m) => m.tenantId === tenantId && m.userId === user.id && m.isActive)
          .map((m) => m.committeeId),
      );
      records = records.filter((c) => myCommitteeIds.has(c.id));
    }

    const attachMembership = options?.mine || !this.isAdmin(user);
    return records
      .filter((c) => c.isActive || this.isAdmin(user))
      .map((c) => this.toCommittee(c, attachMembership ? user.id : undefined));
  }

  async findOne(tenantId: string, id: string, user: AuthUser): Promise<Committee> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, id, user);
    return this.toCommittee(this.ensureCommittee(tenantId, id), user.id);
  }

  async create(tenantId: string, input: CreateCommitteeInput, user: AuthUser): Promise<Committee> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Admin access required');
    }
    const record = this.createEntity(tenantId, {
      name: input.name,
      slug: input.slug ?? this.slugify(input.name),
      description: input.description,
      purpose: input.purpose,
      category: input.category ?? 'governance',
      committeeType: input.committeeType ?? 'standing',
      meetingCadence: input.meetingCadence,
      publicRoster: input.publicRoster ?? false,
      isActive: true,
    });
    return this.toCommittee(record);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateCommitteeInput,
    user: AuthUser,
  ): Promise<Committee> {
    this.seedDemoCommittees(tenantId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, id, user);
    }
    const record = this.updateEntity(tenantId, id, input);
    return this.toCommittee(record);
  }

  async findMembers(
    tenantId: string,
    committeeId: string,
    user: AuthUser,
  ): Promise<CommitteeMember[]> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    return [...this.memberStore.values()]
      .filter((m) => m.tenantId === tenantId && m.committeeId === committeeId)
      .map((m) => this.toMember(m));
  }

  async addMember(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeMemberInput,
    user: AuthUser,
  ): Promise<CommitteeMember> {
    this.seedDemoCommittees(tenantId);
    this.ensureCommittee(tenantId, committeeId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, committeeId, user);
    }
    const now = new Date();
    const record: MemberRecord = {
      id: uuidv4(),
      tenantId,
      committeeId,
      userId: input.userId,
      name: input.name,
      email: input.email,
      role: input.role,
      displayTitle: input.displayTitle,
      photoUrl: input.photoUrl,
      joinedAt: this.iso(now),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.memberStore.set(record.id, record);
    return this.toMember(record);
  }

  async updateMember(
    tenantId: string,
    committeeId: string,
    memberId: string,
    input: UpdateCommitteeMemberInput,
    user: AuthUser,
  ): Promise<CommitteeMember> {
    this.seedDemoCommittees(tenantId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, committeeId, user);
    }
    const existing = this.memberStore.get(memberId);
    if (!existing || existing.tenantId !== tenantId || existing.committeeId !== committeeId) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    const updated = { ...existing, ...input, updatedAt: new Date() };
    this.memberStore.set(memberId, updated);
    return this.toMember(updated);
  }

  async removeMember(
    tenantId: string,
    committeeId: string,
    memberId: string,
    user: AuthUser,
  ): Promise<{ deleted: boolean }> {
    this.seedDemoCommittees(tenantId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, committeeId, user);
    }
    const existing = this.memberStore.get(memberId);
    if (!existing || existing.tenantId !== tenantId || existing.committeeId !== committeeId) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    this.memberStore.delete(memberId);
    return { deleted: true };
  }

  async findBlocks(
    tenantId: string,
    committeeId: string,
    user: AuthUser,
  ): Promise<CommitteeCalendarBlock[]> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    return [...this.blockStore.values()]
      .filter((b) => b.tenantId === tenantId && b.committeeId === committeeId)
      .map((b) => this.toBlock(b));
  }

  async createBlock(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeCalendarBlockInput,
    user: AuthUser,
    requestId?: string,
  ): Promise<CommitteeCalendarBlock> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    const now = new Date();
    const blockType: CommitteeCalendarBlockType = input.blockType ?? 'committee';
    const blocksTempleCalendar =
      input.blocksTempleCalendar ??
      (blockType === 'temple' ? true : blockType === 'personal' ? false : false);
    const record: BlockRecord = {
      id: uuidv4(),
      tenantId,
      committeeId,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      blockType,
      blocksTempleCalendar,
      requestId,
      createdByUserId: user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.blockStore.set(record.id, record);
    return this.toBlock(record);
  }

  async updateBlock(
    tenantId: string,
    committeeId: string,
    blockId: string,
    input: UpdateCommitteeCalendarBlockInput,
    user: AuthUser,
  ): Promise<CommitteeCalendarBlock> {
    this.seedDemoCommittees(tenantId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, committeeId, user);
    }
    const existing = this.blockStore.get(blockId);
    if (!existing || existing.tenantId !== tenantId || existing.committeeId !== committeeId) {
      throw new NotFoundException(`Calendar block ${blockId} not found`);
    }
    const updated: BlockRecord = { ...existing, ...input, updatedAt: new Date() };
    this.blockStore.set(blockId, updated);
    return this.toBlock(updated);
  }

  async deleteBlock(
    tenantId: string,
    committeeId: string,
    blockId: string,
    user: AuthUser,
  ): Promise<{ deleted: boolean }> {
    this.seedDemoCommittees(tenantId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, committeeId, user);
    }
    const existing = this.blockStore.get(blockId);
    if (!existing || existing.tenantId !== tenantId || existing.committeeId !== committeeId) {
      throw new NotFoundException(`Calendar block ${blockId} not found`);
    }
    this.blockStore.delete(blockId);
    return { deleted: true };
  }

  async findTasks(
    tenantId: string,
    committeeId: string,
    user: AuthUser,
    options?: { assigneeUserId?: string },
  ): Promise<CommitteeTask[]> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    let tasks = [...this.taskStore.values()].filter(
      (t) => t.tenantId === tenantId && t.committeeId === committeeId,
    );
    if (options?.assigneeUserId) {
      tasks = tasks.filter((t) => t.assigneeUserId === options.assigneeUserId);
    }
    return tasks.map((t) => this.toTask(t));
  }

  async createTask(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeTaskInput,
    user: AuthUser,
  ): Promise<CommitteeTask> {
    this.seedDemoCommittees(tenantId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, committeeId, user);
    }
    const now = new Date();
    const record: TaskRecord = {
      id: uuidv4(),
      tenantId,
      committeeId,
      title: input.title,
      description: input.description,
      assigneeUserId: input.assigneeUserId,
      assigneeName: input.assigneeName,
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate,
      eventId: input.eventId,
      createdByUserId: user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.taskStore.set(record.id, record);
    return this.toTask(record);
  }

  async updateTask(
    tenantId: string,
    committeeId: string,
    taskId: string,
    input: UpdateCommitteeTaskInput,
    user: AuthUser,
  ): Promise<CommitteeTask> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    const existing = this.taskStore.get(taskId);
    if (!existing || existing.tenantId !== tenantId || existing.committeeId !== committeeId) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    const isAssignee = this.isTaskAssignedToUser(existing, tenantId, user);
    const isUnassigned = !existing.assigneeUserId;
    const isClaiming =
      isUnassigned &&
      input.assigneeUserId != null &&
      this.getUserAssigneeIds(tenantId, user).has(input.assigneeUserId);
    const canManage = this.isAdmin(user) || this.isChair(tenantId, committeeId, user.id);
    if (!canManage && !isAssignee && !isClaiming) {
      throw new ForbiddenException('Cannot update this task');
    }
    let patch = input;
    if (!canManage && isClaiming) {
      patch = {
        assigneeUserId: user.id,
        assigneeName: input.assigneeName ?? user.name,
        status: input.status ?? 'in_progress',
      };
    } else if (!canManage && isAssignee) {
      patch = input.status !== undefined ? { status: input.status } : {};
    }
    const updated: TaskRecord = {
      ...existing,
      ...patch,
      assigneeUserId: patch.assigneeUserId === null ? undefined : (patch.assigneeUserId ?? existing.assigneeUserId),
      assigneeName: patch.assigneeName === null ? undefined : (patch.assigneeName ?? existing.assigneeName),
      eventId: patch.eventId === null ? undefined : (patch.eventId ?? existing.eventId),
      dueDate: patch.dueDate === null ? undefined : (patch.dueDate ?? existing.dueDate),
      updatedAt: new Date(),
    };
    this.taskStore.set(taskId, updated);
    return this.toTask(updated);
  }

  async findTargets(
    tenantId: string,
    committeeId: string,
    user: AuthUser,
  ): Promise<CommitteeTarget[]> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    return [...this.targetStore.values()]
      .filter((t) => t.tenantId === tenantId && t.committeeId === committeeId)
      .map((t) => this.toTarget(t));
  }

  async createTarget(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeTargetInput,
    user: AuthUser,
  ): Promise<CommitteeTarget> {
    this.seedDemoCommittees(tenantId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, committeeId, user);
    }
    const now = new Date();
    const record: TargetRecord = {
      id: uuidv4(),
      tenantId,
      committeeId,
      title: input.title,
      description: input.description,
      period: input.period,
      targetValue: input.targetValue,
      currentValue: input.currentValue ?? 0,
      unit: input.unit,
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
    };
    this.targetStore.set(record.id, record);
    return this.toTarget(record);
  }

  async updateTarget(
    tenantId: string,
    committeeId: string,
    targetId: string,
    input: UpdateCommitteeTargetInput,
    user: AuthUser,
  ): Promise<CommitteeTarget> {
    this.seedDemoCommittees(tenantId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, committeeId, user);
    }
    const existing = this.targetStore.get(targetId);
    if (!existing || existing.tenantId !== tenantId || existing.committeeId !== committeeId) {
      throw new NotFoundException(`Target ${targetId} not found`);
    }
    const updated: TargetRecord = {
      ...existing,
      ...input,
      dueDate: input.dueDate === null ? undefined : (input.dueDate ?? existing.dueDate),
      updatedAt: new Date(),
    };
    this.targetStore.set(targetId, updated);
    return this.toTarget(updated);
  }

  async findRequests(
    tenantId: string,
    committeeId: string,
    user: AuthUser,
    options?: { status?: string; requestedByUserId?: string },
  ): Promise<CommitteeRequest[]> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    let requests = [...this.requestStore.values()].filter(
      (r) => r.tenantId === tenantId && r.committeeId === committeeId,
    );
    if (options?.status) {
      requests = requests.filter((r) => r.status === options.status);
    }
    if (options?.requestedByUserId) {
      requests = requests.filter((r) => r.requestedByUserId === options.requestedByUserId);
    }
    return requests.map((r) => this.toRequest(r));
  }

  async createRequest(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeRequestInput,
    user: AuthUser,
  ): Promise<CommitteeRequest> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    const now = new Date();
    const record: RequestRecord = {
      id: uuidv4(),
      tenantId,
      committeeId,
      type: input.type,
      title: input.title,
      description: input.description,
      status: 'pending',
      requestedByUserId: user.id,
      requestedByName: user.name,
      eventId: input.eventId,
      blockStartDate: input.blockStartDate,
      blockEndDate: input.blockEndDate,
      blockTitle: input.blockTitle,
      createdAt: now,
      updatedAt: now,
    };
    this.requestStore.set(record.id, record);
    return this.toRequest(record);
  }

  async updateRequest(
    tenantId: string,
    committeeId: string,
    requestId: string,
    input: UpdateCommitteeRequestInput,
    user: AuthUser,
  ): Promise<CommitteeRequest> {
    this.seedDemoCommittees(tenantId);
    const existing = this.requestStore.get(requestId);
    if (!existing || existing.tenantId !== tenantId || existing.committeeId !== committeeId) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    const isRequester = this.getUserAssigneeIds(tenantId, user).has(
      existing.requestedByUserId,
    );
    const canReview =
      this.isAdmin(user) || this.isChair(tenantId, committeeId, user.id);

    if (!(input.status === 'cancelled' && isRequester && existing.status === 'pending') && !canReview) {
      throw new ForbiddenException('Only chair or admin can approve/reject requests');
    }

    const now = new Date();
    const reviewed = canReview && (input.status === 'approved' || input.status === 'rejected');
    const updated: RequestRecord = {
      ...existing,
      status: input.status,
      reviewNote: input.reviewNote,
      reviewedByUserId: reviewed ? user.id : existing.reviewedByUserId,
      reviewedByName: reviewed ? user.name : existing.reviewedByName,
      reviewedAt: reviewed ? now : existing.reviewedAt,
      updatedAt: now,
    };
    this.requestStore.set(requestId, updated);

    if (input.status === 'approved' && existing.blockStartDate && existing.blockEndDate) {
      if (existing.type === 'calendar_block') {
        await this.createBlock(
          tenantId,
          committeeId,
          {
            title: existing.blockTitle ?? existing.title,
            startDate: existing.blockStartDate,
            endDate: existing.blockEndDate,
            reason: existing.description,
            blockType: 'temple',
            blocksTempleCalendar: true,
          },
          user,
          requestId,
        );
      } else if (existing.type === 'leave') {
        const block = await this.createBlock(
          tenantId,
          committeeId,
          {
            title: existing.blockTitle ?? `Leave — ${existing.requestedByName ?? 'Member'}`,
            startDate: existing.blockStartDate,
            endDate: existing.blockEndDate,
            reason: existing.description,
            blockType: 'personal',
            blocksTempleCalendar: false,
          },
          user,
          requestId,
        );
        const leaveRecord = this.blockStore.get(block.id);
        if (leaveRecord) {
          leaveRecord.createdByUserId = existing.requestedByUserId;
          this.blockStore.set(block.id, leaveRecord);
        }
      }
    }

    if (reviewed) {
      this.notifications.createInApp(
        tenantId,
        existing.requestedByUserId,
        'general',
        `Request ${input.status}: ${existing.title}`,
        input.reviewNote ??
          `Your ${existing.type.replace('_', ' ')} request "${existing.title}" was ${input.status}.`,
        { committeeId, requestId },
      );
    }

    return this.toRequest(updated);
  }

  async findMessages(
    tenantId: string,
    committeeId: string,
    user: AuthUser,
  ): Promise<CommitteeMessage[]> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    return [...this.messageStore.values()]
      .filter((m) => m.tenantId === tenantId && m.committeeId === committeeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((m) => this.toMessage(m));
  }

  async createMessage(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeMessageInput,
    user: AuthUser,
  ): Promise<CommitteeMessage> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    const now = new Date();
    const record: MessageRecord = {
      id: uuidv4(),
      tenantId,
      committeeId,
      authorUserId: user.id,
      authorName: user.name,
      subject: input.subject,
      body: input.body,
      isAnnouncement: input.isAnnouncement ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.messageStore.set(record.id, record);
    return this.toMessage(record);
  }

  async getDashboard(
    tenantId: string,
    user: AuthUser,
    options?: { committeeId?: string },
  ): Promise<CommitteeDashboard> {
    const committees = await this.findAll(tenantId, user, { mine: true });
    const scopedCommittees = options?.committeeId
      ? committees.filter((c) => c.id === options.committeeId)
      : committees;
    const committeeIds = scopedCommittees.map((c) => c.id);

    const allTasks: CommitteeTask[] = [];
    const allRequests: CommitteeRequest[] = [];
    const allBlocks: CommitteeCalendarBlock[] = [];

    for (const cid of committeeIds) {
      allTasks.push(...(await this.findTasks(tenantId, cid, user)));
      allRequests.push(...(await this.findRequests(tenantId, cid, user)));
      allBlocks.push(...(await this.findBlocks(tenantId, cid, user)));
    }

    const myTasks = allTasks.filter(
      (t) => this.isTaskAssignedToUser(t, tenantId, user) && t.status !== 'done',
    );
    const isAvailable = (t: CommitteeTask) =>
      !t.assigneeUserId && t.status !== 'done' && t.status !== 'blocked';
    const taskBoard = {
      counts: {
        available: allTasks.filter(isAvailable).length,
        todo: allTasks.filter((t) => !!t.assigneeUserId && t.status === 'todo').length,
        in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
        blocked: allTasks.filter((t) => t.status === 'blocked').length,
        done: allTasks.filter((t) => t.status === 'done').length,
      },
      openPool: allTasks.filter(isAvailable).slice(0, 5),
    };
    const pendingApprovals = allRequests.filter((r) => {
      if (r.status !== 'pending') return false;
      return this.isAdmin(user) || this.isChair(tenantId, r.committeeId, user.id);
    });

    const today = new Date().toISOString().slice(0, 10);
    const upcomingBlocks = allBlocks
      .filter((b) => b.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 5);

    return {
      committees: scopedCommittees,
      pendingApprovals,
      myTasks,
      upcomingBlocks,
      taskBoard,
      stats: {
        totalCommittees: scopedCommittees.length,
        openTasks: myTasks.length,
        pendingRequests: pendingApprovals.length,
        upcomingBlocks: upcomingBlocks.length,
        availableTasks: taskBoard.counts.available,
      },
    };
  }

  async findMyTasks(
    tenantId: string,
    user: AuthUser,
    options?: { committeeId?: string },
  ): Promise<CommitteeTask[]> {
    const board = await this.findBoardTasks(tenantId, user, options);
    return board.filter((t) => this.isTaskAssignedToUser(t, tenantId, user));
  }

  async findBoardTasks(
    tenantId: string,
    user: AuthUser,
    options?: { committeeId?: string },
  ): Promise<CommitteeTask[]> {
    const committeeIds = await this.resolveMyCommitteeIds(tenantId, user, options?.committeeId);
    const tasks: CommitteeTask[] = [];
    for (const cid of committeeIds) {
      tasks.push(...(await this.findTasks(tenantId, cid, user)));
    }
    return tasks.sort((a, b) => {
      const statusOrder = { todo: 0, in_progress: 1, blocked: 2, done: 3 };
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    });
  }

  async findMyBlocks(
    tenantId: string,
    user: AuthUser,
    options?: { committeeId?: string },
  ): Promise<CommitteeCalendarBlock[]> {
    const committeeIds = await this.resolveMyCommitteeIds(tenantId, user, options?.committeeId);
    const blocks: CommitteeCalendarBlock[] = [];
    for (const cid of committeeIds) {
      blocks.push(...(await this.findBlocks(tenantId, cid, user)));
    }
    return blocks.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  async findMyRequests(
    tenantId: string,
    user: AuthUser,
    options?: { committeeId?: string },
  ): Promise<CommitteeRequest[]> {
    const committeeIds = await this.resolveMyCommitteeIds(tenantId, user, options?.committeeId);
    const assigneeIds = this.getUserAssigneeIds(tenantId, user);
    const requests: CommitteeRequest[] = [];
    for (const cid of committeeIds) {
      const all = await this.findRequests(tenantId, cid, user);
      requests.push(
        ...all.filter((r) => assigneeIds.has(r.requestedByUserId)),
      );
    }
    return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findPendingLeaveForCalendar(
    tenantId: string,
    user: AuthUser,
    options?: { committeeId?: string },
  ): Promise<CommitteeRequest[]> {
    const committeeIds = await this.resolveMyCommitteeIds(tenantId, user, options?.committeeId);
    const requests: CommitteeRequest[] = [];
    for (const cid of committeeIds) {
      const all = await this.findRequests(tenantId, cid, user);
      requests.push(
        ...all.filter(
          (r) =>
            r.type === 'leave' &&
            r.status === 'pending' &&
            r.blockStartDate &&
            r.blockEndDate,
        ),
      );
    }
    return requests.sort((a, b) =>
      (a.blockStartDate ?? '').localeCompare(b.blockStartDate ?? ''),
    );
  }

  async findPendingApprovals(
    tenantId: string,
    user: AuthUser,
    options?: { committeeId?: string },
  ): Promise<CommitteeRequest[]> {
    const committeeIds = await this.resolveMyCommitteeIds(tenantId, user, options?.committeeId);
    const requests: CommitteeRequest[] = [];
    for (const cid of committeeIds) {
      const all = await this.findRequests(tenantId, cid, user);
      requests.push(
        ...all.filter((r) => {
          if (r.status !== 'pending') return false;
          return this.isAdmin(user) || this.isChair(tenantId, cid, user.id);
        }),
      );
    }
    return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRoster(tenantId: string, user: AuthUser): Promise<CommitteeRoster> {
    this.seedDemoCommittees(tenantId);
    let records = this.scoped(tenantId).filter((c) => c.isActive);

    if (!this.isAdmin(user)) {
      records = records.filter((c) => c.publicRoster);
    }

    const byCategory = new Map<CommitteeCategory, CommitteeRoster['categories'][0]['committees']>();

    for (const record of records) {
      const members = [...this.memberStore.values()]
        .filter((m) => m.tenantId === tenantId && m.committeeId === record.id && m.isActive)
        .sort((a, b) => {
          const roleOrder = { chair: 0, vice_chair: 1, secretary: 2, member: 3 };
          return roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name);
        })
        .map((m) => this.toMember(m));

      const entry = { committee: this.toCommittee(record), members };
      const list = byCategory.get(record.category) ?? [];
      list.push(entry);
      byCategory.set(record.category, list);
    }

    const categories = COMMITTEE_CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map(
      (category) => ({
        category,
        label: COMMITTEE_CATEGORY_LABELS[category],
        committees: (byCategory.get(category) ?? []).sort((a, b) =>
          a.committee.name.localeCompare(b.committee.name),
        ),
      }),
    );

    return { categories };
  }

  async findReports(
    tenantId: string,
    committeeId: string,
    user: AuthUser,
  ): Promise<CommitteeReport[]> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    return [...this.reportStore.values()]
      .filter((r) => r.tenantId === tenantId && r.committeeId === committeeId)
      .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
      .map((r) => this.toReport(r));
  }

  async findAllReports(tenantId: string, user: AuthUser): Promise<CommitteeReport[]> {
    this.seedDemoCommittees(tenantId);
    let committeeIds: Set<string>;

    if (this.isAdmin(user)) {
      committeeIds = new Set(this.scoped(tenantId).map((c) => c.id));
    } else {
      committeeIds = new Set(
        [...this.memberStore.values()]
          .filter((m) => m.tenantId === tenantId && m.userId === user.id && m.isActive)
          .map((m) => m.committeeId),
      );
    }

    return [...this.reportStore.values()]
      .filter((r) => r.tenantId === tenantId && committeeIds.has(r.committeeId))
      .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
      .map((r) => this.toReport(r));
  }

  async createReport(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeReportInput,
    user: AuthUser,
  ): Promise<CommitteeReport> {
    this.seedDemoCommittees(tenantId);
    if (!this.isAdmin(user)) {
      this.assertManageAccess(tenantId, committeeId, user);
    }
    this.ensureCommittee(tenantId, committeeId);
    const now = new Date();
    const record: ReportRecord = {
      id: uuidv4(),
      tenantId,
      committeeId,
      period: input.period,
      title: input.title,
      meetingDate: input.meetingDate,
      minutesSummary: input.minutesSummary,
      attendanceCount: input.attendanceCount,
      expectedAttendance: input.expectedAttendance,
      createdByUserId: user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.reportStore.set(record.id, record);
    return this.toReport(record);
  }

  async findLeadershipHistory(
    tenantId: string,
    committeeId: string,
    user: AuthUser,
  ): Promise<CommitteeLeadershipRecord[]> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, committeeId, user);
    return [...this.leadershipStore.values()]
      .filter((l) => l.tenantId === tenantId && l.committeeId === committeeId)
      .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
      .map((l) => this.toLeadership(l));
  }
}
