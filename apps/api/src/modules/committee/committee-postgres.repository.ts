import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CommitteeCalendarBlockType,
  CommitteeRequest,
  CreateCommitteeCalendarBlockInput,
  CreateCommitteeInput,
  CreateCommitteeMemberInput,
  CreateCommitteeMessageInput,
  CreateCommitteeReportInput,
  CreateCommitteeRequestInput,
  CreateCommitteeTargetInput,
  CreateCommitteeTaskInput,
  UpdateCommitteeCalendarBlockInput,
  UpdateCommitteeInput,
  UpdateCommitteeMemberInput,
  UpdateCommitteeTargetInput,
  UpdateCommitteeTaskInput,
} from '@tms/types';
import { v4 as uuidv4 } from 'uuid';
import { TenantContextStorage } from '../../common/context/tenant-context.storage';
import { TenantConnectionService } from '../../database/tenant-connection.service';
import {
  CommitteeCalendarBlockEntity,
  CommitteeEntity,
  CommitteeLeadershipEntity,
  CommitteeMemberEntity,
  CommitteeMessageEntity,
  CommitteeReportEntity,
  CommitteeRequestEntity,
  CommitteeTargetEntity,
  CommitteeTaskEntity,
} from '../../database/entities/tenant';
import { TenantDataService } from '../../database/tenant-data.service';
import { seedCommitteesToPostgres } from './committee-postgres.seed';

export type PgCommitteeRecord = CommitteeEntity & { tenantId: string };
export type PgMemberRecord = CommitteeMemberEntity & {
  tenantId: string;
  updatedAt: Date;
  joinedAtIso: string;
};
export type PgBlockRecord = CommitteeCalendarBlockEntity & { tenantId: string };
export type PgTaskRecord = CommitteeTaskEntity & { tenantId: string };
export type PgTargetRecord = CommitteeTargetEntity & { tenantId: string };
export type PgRequestRecord = CommitteeRequestEntity & { tenantId: string };
export type PgMessageRecord = CommitteeMessageEntity & {
  tenantId: string;
  updatedAt: Date;
};
export type PgReportRecord = CommitteeReportEntity & { tenantId: string };
export type PgLeadershipRecord = CommitteeLeadershipEntity & { tenantId: string };

@Injectable()
export class CommitteePostgresRepository {
  constructor(
    private readonly tenantData: TenantDataService,
    private readonly connections: TenantConnectionService,
  ) {}

  async ensureSeeded(tenantId: string): Promise<void> {
    const repo = await this.tenantData.committees();
    if ((await repo.count()) > 0) return;
    const ctx = TenantContextStorage.get();
    const ds = await this.connections.getDataSource(ctx);
    await seedCommitteesToPostgres(ds, tenantId);
  }

  private withTenant<T extends object>(tenantId: string, entity: T): T & { tenantId: string } {
    return { ...entity, tenantId };
  }

  private memberRecord(tenantId: string, entity: CommitteeMemberEntity): PgMemberRecord {
    return {
      ...entity,
      tenantId,
      joinedAtIso: entity.joinedAt.toISOString(),
      updatedAt: entity.createdAt,
    };
  }

  private messageRecord(tenantId: string, entity: CommitteeMessageEntity): PgMessageRecord {
    return { ...entity, tenantId, updatedAt: entity.createdAt };
  }

  async findAllCommittees(tenantId: string): Promise<PgCommitteeRecord[]> {
    const repo = await this.tenantData.committees();
    const rows = await repo.find();
    return rows.map((r) => this.withTenant(tenantId, r));
  }

  async findCommittee(tenantId: string, id: string): Promise<PgCommitteeRecord | null> {
    const repo = await this.tenantData.committees();
    const row = await repo.findOne({ where: { id } });
    return row ? this.withTenant(tenantId, row) : null;
  }

  async createCommittee(
    tenantId: string,
    input: CreateCommitteeInput,
    slug: string,
  ): Promise<PgCommitteeRecord> {
    const repo = await this.tenantData.committees();
    const now = new Date();
    const saved = await repo.save(
      repo.create({
        id: uuidv4(),
        name: input.name,
        slug,
        description: input.description,
        purpose: input.purpose,
        category: input.category ?? 'governance',
        committeeType: input.committeeType ?? 'standing',
        meetingCadence: input.meetingCadence,
        publicRoster: input.publicRoster ?? false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.withTenant(tenantId, saved);
  }

  async updateCommittee(
    tenantId: string,
    id: string,
    input: UpdateCommitteeInput,
  ): Promise<PgCommitteeRecord> {
    const repo = await this.tenantData.committees();
    const existing = await repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Committee ${id} not found`);
    }
    const saved = await repo.save({ ...existing, ...input, updatedAt: new Date() });
    return this.withTenant(tenantId, saved);
  }

  async countActiveMembers(tenantId: string, committeeId: string): Promise<number> {
    const repo = await this.tenantData.committeeMembers();
    return repo.count({ where: { committeeId, isActive: true } });
  }

  async findActiveMemberForUser(
    tenantId: string,
    committeeId: string,
    userId: string,
  ): Promise<PgMemberRecord | null> {
    const repo = await this.tenantData.committeeMembers();
    const row = await repo.findOne({ where: { committeeId, userId, isActive: true } });
    return row ? this.memberRecord(tenantId, row) : null;
  }

  async findMembers(tenantId: string, committeeId: string): Promise<PgMemberRecord[]> {
    const repo = await this.tenantData.committeeMembers();
    const rows = await repo.find({ where: { committeeId } });
    return rows.map((r) => this.memberRecord(tenantId, r));
  }

  async findMember(
    tenantId: string,
    committeeId: string,
    memberId: string,
  ): Promise<PgMemberRecord | null> {
    const repo = await this.tenantData.committeeMembers();
    const row = await repo.findOne({ where: { id: memberId, committeeId } });
    return row ? this.memberRecord(tenantId, row) : null;
  }

  async findMembersForUser(tenantId: string, userId: string): Promise<PgMemberRecord[]> {
    const repo = await this.tenantData.committeeMembers();
    const rows = await repo.find({ where: { userId, isActive: true } });
    return rows.map((r) => this.memberRecord(tenantId, r));
  }

  async findAllMembers(tenantId: string): Promise<PgMemberRecord[]> {
    const repo = await this.tenantData.committeeMembers();
    const rows = await repo.find();
    return rows.map((r) => this.memberRecord(tenantId, r));
  }

  async findMembersByEmail(tenantId: string, email: string): Promise<PgMemberRecord[]> {
    const repo = await this.tenantData.committeeMembers();
    const rows = await repo
      .createQueryBuilder('m')
      .where('LOWER(m.email) = LOWER(:email)', { email })
      .andWhere('m.isActive = true')
      .getMany();
    return rows.map((r) => this.memberRecord(tenantId, r));
  }

  async createMember(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeMemberInput,
  ): Promise<PgMemberRecord> {
    const repo = await this.tenantData.committeeMembers();
    const now = new Date();
    const saved = await repo.save(
      repo.create({
        committeeId,
        userId: input.userId,
        name: input.name,
        email: input.email,
        role: input.role,
        displayTitle: input.displayTitle,
        photoUrl: input.photoUrl,
        joinedAt: now,
        isActive: true,
        createdAt: now,
      }),
    );
    return this.memberRecord(tenantId, saved);
  }

  async updateMember(
    tenantId: string,
    committeeId: string,
    memberId: string,
    input: UpdateCommitteeMemberInput,
  ): Promise<PgMemberRecord> {
    const repo = await this.tenantData.committeeMembers();
    const existing = await repo.findOne({ where: { id: memberId, committeeId } });
    if (!existing) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    const saved = await repo.save({ ...existing, ...input });
    return this.memberRecord(tenantId, saved);
  }

  async deleteMember(committeeId: string, memberId: string): Promise<void> {
    const repo = await this.tenantData.committeeMembers();
    const existing = await repo.findOne({ where: { id: memberId, committeeId } });
    if (!existing) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    await repo.remove(existing);
  }

  async findBlocks(tenantId: string, committeeId: string): Promise<PgBlockRecord[]> {
    const repo = await this.tenantData.committeeCalendarBlocks();
    const rows = await repo.find({ where: { committeeId } });
    return rows.map((r) => this.withTenant(tenantId, r));
  }

  async findBlock(
    tenantId: string,
    committeeId: string,
    blockId: string,
  ): Promise<PgBlockRecord | null> {
    const repo = await this.tenantData.committeeCalendarBlocks();
    const row = await repo.findOne({ where: { id: blockId, committeeId } });
    return row ? this.withTenant(tenantId, row) : null;
  }

  async createBlock(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeCalendarBlockInput,
    createdByUserId: string,
    requestId?: string,
  ): Promise<PgBlockRecord> {
    const repo = await this.tenantData.committeeCalendarBlocks();
    const now = new Date();
    const blockType: CommitteeCalendarBlockType = input.blockType ?? 'committee';
    const blocksTempleCalendar =
      input.blocksTempleCalendar ??
      (blockType === 'temple' ? true : blockType === 'personal' ? false : false);
    const saved = await repo.save(
      repo.create({
        committeeId,
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        blockType,
        blocksTempleCalendar,
        requestId,
        createdByUserId,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.withTenant(tenantId, saved);
  }

  async updateBlock(
    tenantId: string,
    committeeId: string,
    blockId: string,
    input: UpdateCommitteeCalendarBlockInput,
  ): Promise<PgBlockRecord> {
    const repo = await this.tenantData.committeeCalendarBlocks();
    const existing = await repo.findOne({ where: { id: blockId, committeeId } });
    if (!existing) {
      throw new NotFoundException(`Calendar block ${blockId} not found`);
    }
    const saved = await repo.save({ ...existing, ...input, updatedAt: new Date() });
    return this.withTenant(tenantId, saved);
  }

  async updateBlockCreatedBy(blockId: string, createdByUserId: string): Promise<void> {
    const repo = await this.tenantData.committeeCalendarBlocks();
    const existing = await repo.findOne({ where: { id: blockId } });
    if (!existing) return;
    await repo.save({ ...existing, createdByUserId, updatedAt: new Date() });
  }

  async deleteBlock(committeeId: string, blockId: string): Promise<void> {
    const repo = await this.tenantData.committeeCalendarBlocks();
    const existing = await repo.findOne({ where: { id: blockId, committeeId } });
    if (!existing) {
      throw new NotFoundException(`Calendar block ${blockId} not found`);
    }
    await repo.remove(existing);
  }

  async findTasks(
    tenantId: string,
    committeeId: string,
    options?: { assigneeUserId?: string },
  ): Promise<PgTaskRecord[]> {
    const repo = await this.tenantData.committeeTasks();
    const qb = repo.createQueryBuilder('t').where('t.committeeId = :committeeId', { committeeId });
    if (options?.assigneeUserId) {
      qb.andWhere('t.assigneeUserId = :assigneeUserId', { assigneeUserId: options.assigneeUserId });
    }
    const rows = await qb.getMany();
    return rows.map((r) => this.withTenant(tenantId, r));
  }

  async findTask(
    tenantId: string,
    committeeId: string,
    taskId: string,
  ): Promise<PgTaskRecord | null> {
    const repo = await this.tenantData.committeeTasks();
    const row = await repo.findOne({ where: { id: taskId, committeeId } });
    return row ? this.withTenant(tenantId, row) : null;
  }

  async createTask(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeTaskInput,
    createdByUserId: string,
  ): Promise<PgTaskRecord> {
    const repo = await this.tenantData.committeeTasks();
    const now = new Date();
    const saved = await repo.save(
      repo.create({
        committeeId,
        title: input.title,
        description: input.description,
        assigneeUserId: input.assigneeUserId,
        assigneeName: input.assigneeName,
        status: input.status ?? 'todo',
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate,
        eventId: input.eventId,
        createdByUserId,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.withTenant(tenantId, saved);
  }

  async updateTask(
    tenantId: string,
    committeeId: string,
    taskId: string,
    patch: UpdateCommitteeTaskInput,
  ): Promise<PgTaskRecord> {
    const repo = await this.tenantData.committeeTasks();
    const existing = await repo.findOne({ where: { id: taskId, committeeId } });
    if (!existing) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    const saved = await repo.save({
      ...existing,
      ...patch,
      assigneeUserId:
        patch.assigneeUserId === null ? undefined : (patch.assigneeUserId ?? existing.assigneeUserId),
      assigneeName:
        patch.assigneeName === null ? undefined : (patch.assigneeName ?? existing.assigneeName),
      eventId: patch.eventId === null ? undefined : (patch.eventId ?? existing.eventId),
      dueDate: patch.dueDate === null ? undefined : (patch.dueDate ?? existing.dueDate),
      updatedAt: new Date(),
    });
    return this.withTenant(tenantId, saved);
  }

  async findTargets(tenantId: string, committeeId: string): Promise<PgTargetRecord[]> {
    const repo = await this.tenantData.committeeTargets();
    const rows = await repo.find({ where: { committeeId } });
    return rows.map((r) => this.withTenant(tenantId, r));
  }

  async findTarget(
    tenantId: string,
    committeeId: string,
    targetId: string,
  ): Promise<PgTargetRecord | null> {
    const repo = await this.tenantData.committeeTargets();
    const row = await repo.findOne({ where: { id: targetId, committeeId } });
    return row ? this.withTenant(tenantId, row) : null;
  }

  async createTarget(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeTargetInput,
  ): Promise<PgTargetRecord> {
    const repo = await this.tenantData.committeeTargets();
    const now = new Date();
    const saved = await repo.save(
      repo.create({
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
      }),
    );
    return this.withTenant(tenantId, saved);
  }

  async updateTarget(
    tenantId: string,
    committeeId: string,
    targetId: string,
    input: UpdateCommitteeTargetInput,
  ): Promise<PgTargetRecord> {
    const repo = await this.tenantData.committeeTargets();
    const existing = await repo.findOne({ where: { id: targetId, committeeId } });
    if (!existing) {
      throw new NotFoundException(`Target ${targetId} not found`);
    }
    const saved = await repo.save({
      ...existing,
      ...input,
      dueDate: input.dueDate === null ? undefined : (input.dueDate ?? existing.dueDate),
      updatedAt: new Date(),
    });
    return this.withTenant(tenantId, saved);
  }

  async findRequests(
    tenantId: string,
    committeeId: string,
    options?: { status?: string; requestedByUserId?: string },
  ): Promise<PgRequestRecord[]> {
    const repo = await this.tenantData.committeeRequests();
    const qb = repo.createQueryBuilder('r').where('r.committeeId = :committeeId', { committeeId });
    if (options?.status) {
      qb.andWhere('r.status = :status', { status: options.status });
    }
    if (options?.requestedByUserId) {
      qb.andWhere('r.requestedByUserId = :requestedByUserId', {
        requestedByUserId: options.requestedByUserId,
      });
    }
    const rows = await qb.getMany();
    return rows.map((r) => this.withTenant(tenantId, r));
  }

  async findRequest(
    tenantId: string,
    committeeId: string,
    requestId: string,
  ): Promise<PgRequestRecord | null> {
    const repo = await this.tenantData.committeeRequests();
    const row = await repo.findOne({ where: { id: requestId, committeeId } });
    return row ? this.withTenant(tenantId, row) : null;
  }

  async createRequest(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeRequestInput,
    requestedByUserId: string,
    requestedByName?: string,
  ): Promise<PgRequestRecord> {
    const repo = await this.tenantData.committeeRequests();
    const now = new Date();
    const saved = await repo.save(
      repo.create({
        committeeId,
        type: input.type,
        title: input.title,
        description: input.description,
        status: 'pending',
        requestedByUserId,
        requestedByName,
        eventId: input.eventId,
        blockStartDate: input.blockStartDate,
        blockEndDate: input.blockEndDate,
        blockTitle: input.blockTitle,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.withTenant(tenantId, saved);
  }

  async updateRequest(
    tenantId: string,
    committeeId: string,
    requestId: string,
    patch: {
      status: CommitteeRequest['status'];
      reviewNote?: string;
      reviewedByUserId?: string;
      reviewedByName?: string;
      reviewedAt?: Date;
    },
  ): Promise<PgRequestRecord> {
    const repo = await this.tenantData.committeeRequests();
    const existing = await repo.findOne({ where: { id: requestId, committeeId } });
    if (!existing) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }
    const saved = await repo.save({ ...existing, ...patch, updatedAt: new Date() });
    return this.withTenant(tenantId, saved);
  }

  async findMessages(tenantId: string, committeeId: string): Promise<PgMessageRecord[]> {
    const repo = await this.tenantData.committeeMessages();
    const rows = await repo.find({
      where: { committeeId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.messageRecord(tenantId, r));
  }

  async createMessage(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeMessageInput,
    authorUserId: string,
    authorName?: string,
  ): Promise<PgMessageRecord> {
    const repo = await this.tenantData.committeeMessages();
    const now = new Date();
    const saved = await repo.save(
      repo.create({
        committeeId,
        authorUserId,
        authorName,
        subject: input.subject,
        body: input.body,
        isAnnouncement: input.isAnnouncement ?? false,
        createdAt: now,
      }),
    );
    return this.messageRecord(tenantId, saved);
  }

  async findReports(tenantId: string, committeeId: string): Promise<PgReportRecord[]> {
    const repo = await this.tenantData.committeeReports();
    const rows = await repo.find({
      where: { committeeId },
      order: { meetingDate: 'DESC' },
    });
    return rows.map((r) => this.withTenant(tenantId, r));
  }

  async findReportsForCommittees(
    tenantId: string,
    committeeIds: string[],
  ): Promise<PgReportRecord[]> {
    if (committeeIds.length === 0) return [];
    const repo = await this.tenantData.committeeReports();
    const rows = await repo
      .createQueryBuilder('r')
      .where('r.committeeId IN (:...committeeIds)', { committeeIds })
      .orderBy('r.meetingDate', 'DESC')
      .getMany();
    return rows.map((r) => this.withTenant(tenantId, r));
  }

  async createReport(
    tenantId: string,
    committeeId: string,
    input: CreateCommitteeReportInput,
    createdByUserId: string,
  ): Promise<PgReportRecord> {
    const repo = await this.tenantData.committeeReports();
    const now = new Date();
    const saved = await repo.save(
      repo.create({
        id: uuidv4(),
        committeeId,
        period: input.period,
        title: input.title,
        meetingDate: input.meetingDate,
        minutesSummary: input.minutesSummary,
        attendanceCount: input.attendanceCount,
        expectedAttendance: input.expectedAttendance,
        createdByUserId,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.withTenant(tenantId, saved);
  }

  async findLeadershipHistory(
    tenantId: string,
    committeeId: string,
  ): Promise<PgLeadershipRecord[]> {
    const repo = await this.tenantData.committeeLeadership();
    const rows = await repo.find({
      where: { committeeId },
      order: { startDate: 'DESC' },
    });
    return rows.map((r) => this.withTenant(tenantId, r));
  }
}
