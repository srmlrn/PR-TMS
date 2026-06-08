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
  CommitteeDashboard,
  CommitteeMember,
  CommitteeMessage,
  CommitteeRequest,
  CommitteeTarget,
  CommitteeTask,
  CreateCommitteeCalendarBlockInput,
  CreateCommitteeInput,
  CreateCommitteeMemberInput,
  CreateCommitteeMessageInput,
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
import { BaseTenantService, TenantEntity } from '../../common/base/base-tenant.service';
import { TenantDataService } from '../../database/tenant-data.service';
import { NotificationsService } from '../notifications/notifications.service';

type CommitteeRecord = TenantEntity & {
  name: string;
  description?: string;
  purpose?: string;
  isActive: boolean;
};

type MemberRecord = TenantEntity & {
  committeeId: string;
  userId: string;
  name: string;
  email?: string;
  role: CommitteeMember['role'];
  joinedAt: string;
  isActive: boolean;
};

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

const DEMO_COMMITTEE_SV = 'committee-sv-governance';
const DEMO_COMMITTEE_GANESHA = 'committee-ganesha-governance';

@Injectable()
export class CommitteeService extends BaseTenantService<CommitteeRecord> implements OnModuleInit {
  protected store = new Map<string, CommitteeRecord>();
  private memberStore = new Map<string, MemberRecord>();
  private blockStore = new Map<string, BlockRecord>();
  private taskStore = new Map<string, TaskRecord>();
  private targetStore = new Map<string, TargetRecord>();
  private requestStore = new Map<string, RequestRecord>();
  private messageStore = new Map<string, MessageRecord>();

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

  private toCommittee(record: CommitteeRecord): Committee {
    const memberCount = [...this.memberStore.values()].filter(
      (m) => m.tenantId === record.tenantId && m.committeeId === record.id && m.isActive,
    ).length;
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      purpose: record.purpose,
      isActive: record.isActive,
      memberCount,
      createdAt: this.iso(record.createdAt),
      updatedAt: this.iso(record.updatedAt),
    };
  }

  private toMember(record: MemberRecord): CommitteeMember {
    const { tenantId: _t, createdAt: _c, updatedAt: _u, ...m } = record;
    return m;
  }

  private toBlock(record: BlockRecord): CommitteeCalendarBlock {
    const { tenantId: _t, createdAt, updatedAt, ...b } = record;
    return { ...b, createdAt: this.iso(createdAt), updatedAt: this.iso(updatedAt) };
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

  private seedDemoCommittees(tenantId: string): void {
    if (this.scoped(tenantId).length > 0) return;

    const now = new Date();
    const isSv = tenantId === SV_TEMPLE_ID;
    const committeeId = isSv ? DEMO_COMMITTEE_SV : DEMO_COMMITTEE_GANESHA;
    const committeeUserId = isSv ? 'user-committee-001' : 'user-ganesha-committee-001';
    const adminUserId = isSv ? 'user-admin-001' : 'user-ganesha-admin-001';

    this.store.set(committeeId, {
      id: committeeId,
      tenantId,
      name: isSv ? 'Temple Governance Committee' : 'HCC Governance Committee',
      description: 'Oversees temple operations, events, and community initiatives.',
      purpose: 'Governance, planning, and oversight',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const members: MemberRecord[] = [
      {
        id: `${committeeId}-member-chair`,
        tenantId,
        committeeId,
        userId: adminUserId,
        name: isSv ? 'Temple Admin' : 'HCC Admin',
        email: isSv ? 'admin@svtemple.org' : 'admin@sgtemple.org',
        role: 'chair',
        joinedAt: this.iso(now),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `${committeeId}-member-001`,
        tenantId,
        committeeId,
        userId: committeeUserId,
        name: isSv ? 'Committee Member Raj' : 'Committee Member Priya',
        email: isSv ? 'committee@svtemple.org' : 'committee@sgtemple.org',
        role: 'member',
        joinedAt: this.iso(now),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const m of members) {
      this.memberStore.set(m.id, m);
    }

    this.taskStore.set(`${committeeId}-task-001`, {
      id: `${committeeId}-task-001`,
      tenantId,
      committeeId,
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

    this.targetStore.set(`${committeeId}-target-001`, {
      id: `${committeeId}-target-001`,
      tenantId,
      committeeId,
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

    this.blockStore.set(`${committeeId}-block-001`, {
      id: `${committeeId}-block-001`,
      tenantId,
      committeeId,
      title: 'Annual General Meeting',
      startDate: new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString().slice(0, 10),
      endDate: new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString().slice(0, 10),
      reason: 'Reserved for AGM and committee elections',
      blocksTempleCalendar: true,
      createdByUserId: adminUserId,
      createdAt: now,
      updatedAt: now,
    });

    this.messageStore.set(`${committeeId}-msg-001`, {
      id: `${committeeId}-msg-001`,
      tenantId,
      committeeId,
      authorUserId: adminUserId,
      authorName: isSv ? 'Temple Admin' : 'HCC Admin',
      subject: 'Welcome to the governance committee',
      body: 'Please review the quarterly targets and submit any calendar block requests before month end.',
      isAnnouncement: true,
      createdAt: now,
      updatedAt: now,
    });
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

    return records
      .filter((c) => c.isActive || this.isAdmin(user))
      .map((c) => this.toCommittee(c));
  }

  async findOne(tenantId: string, id: string, user: AuthUser): Promise<Committee> {
    this.seedDemoCommittees(tenantId);
    this.assertCommitteeAccess(tenantId, id, user);
    return this.toCommittee(this.ensureCommittee(tenantId, id));
  }

  async create(tenantId: string, input: CreateCommitteeInput, user: AuthUser): Promise<Committee> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Admin access required');
    }
    const record = this.createEntity(tenantId, {
      name: input.name,
      description: input.description,
      purpose: input.purpose,
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
    const record: BlockRecord = {
      id: uuidv4(),
      tenantId,
      committeeId,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      blocksTempleCalendar: input.blocksTempleCalendar ?? true,
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
    const isAssignee = existing.assigneeUserId === user.id;
    const canManage = this.isAdmin(user) || this.isChair(tenantId, committeeId, user.id);
    if (!canManage && !isAssignee) {
      throw new ForbiddenException('Cannot update this task');
    }
    let patch = input;
    if (!canManage && isAssignee) {
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

    const isRequester = existing.requestedByUserId === user.id;
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

    if (
      input.status === 'approved' &&
      existing.type === 'calendar_block' &&
      existing.blockStartDate &&
      existing.blockEndDate
    ) {
      await this.createBlock(
        tenantId,
        committeeId,
        {
          title: existing.blockTitle ?? existing.title,
          startDate: existing.blockStartDate,
          endDate: existing.blockEndDate,
          reason: existing.description,
          blocksTempleCalendar: true,
        },
        user,
        requestId,
      );
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

  async getDashboard(tenantId: string, user: AuthUser): Promise<CommitteeDashboard> {
    const committees = await this.findAll(tenantId, user, { mine: true });
    const committeeIds = committees.map((c) => c.id);

    const allTasks: CommitteeTask[] = [];
    const allRequests: CommitteeRequest[] = [];
    const allBlocks: CommitteeCalendarBlock[] = [];

    for (const cid of committeeIds) {
      allTasks.push(...(await this.findTasks(tenantId, cid, user)));
      allRequests.push(...(await this.findRequests(tenantId, cid, user)));
      allBlocks.push(...(await this.findBlocks(tenantId, cid, user)));
    }

    const myTasks = allTasks.filter(
      (t) => t.assigneeUserId === user.id && t.status !== 'done',
    );
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
      committees,
      pendingApprovals,
      myTasks,
      upcomingBlocks,
      stats: {
        totalCommittees: committees.length,
        openTasks: myTasks.length,
        pendingRequests: pendingApprovals.length,
        upcomingBlocks: upcomingBlocks.length,
      },
    };
  }

  async findMyTasks(tenantId: string, user: AuthUser): Promise<CommitteeTask[]> {
    const committees = await this.findAll(tenantId, user, { mine: true });
    const tasks: CommitteeTask[] = [];
    for (const c of committees) {
      tasks.push(
        ...(await this.findTasks(tenantId, c.id, user, { assigneeUserId: user.id })),
      );
    }
    return tasks;
  }

  async findMyBlocks(tenantId: string, user: AuthUser): Promise<CommitteeCalendarBlock[]> {
    const committees = await this.findAll(tenantId, user, { mine: true });
    const blocks: CommitteeCalendarBlock[] = [];
    for (const c of committees) {
      blocks.push(...(await this.findBlocks(tenantId, c.id, user)));
    }
    return blocks.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  async findMyRequests(tenantId: string, user: AuthUser): Promise<CommitteeRequest[]> {
    const committees = await this.findAll(tenantId, user, { mine: true });
    const requests: CommitteeRequest[] = [];
    for (const c of committees) {
      requests.push(
        ...(await this.findRequests(tenantId, c.id, user, {
          requestedByUserId: user.id,
        })),
      );
    }
    return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
