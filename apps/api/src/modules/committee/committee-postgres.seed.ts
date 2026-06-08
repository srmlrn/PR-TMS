import { DataSource } from 'typeorm';
import { GANESHA_TEMPLE_ID, SV_TEMPLE_ID } from '@tms/types';
import { v5 as uuidv5 } from 'uuid';
import {
  COMMITTEE_SEED_VERSION,
  committeeIdFor,
  getCommitteeSeedsForTenant,
  parseMember,
} from '../../data/committee-seed-data';
import { lookupGaneshaCommitteePhoto } from '../../data/committee-photo-map';
import {
  CommitteeEntity,
  CommitteeMemberEntity,
  CommitteeCalendarBlockEntity,
  CommitteeTaskEntity,
  CommitteeTargetEntity,
  CommitteeRequestEntity,
  CommitteeMessageEntity,
  CommitteeReportEntity,
  CommitteeLeadershipEntity,
} from '../../database/entities/tenant';

/** Valid UUID namespace for deterministic committee sub-entity ids (uuid v5). */
const SEED_UUID_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function seedUuid(key: string): string {
  return uuidv5(key, SEED_UUID_NS);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function seedCommitteesToPostgres(ds: DataSource, tenantId: string): Promise<void> {
  const committeeRepo = ds.getRepository(CommitteeEntity);
  if ((await committeeRepo.count()) > 0) {
    return;
  }

  const seeds = getCommitteeSeedsForTenant(tenantId);
  if (seeds.length === 0) return;

  const now = new Date();
  const isSv = tenantId === SV_TEMPLE_ID;
  const isGanesha = tenantId === GANESHA_TEMPLE_ID;
  const committeeUserId = isSv ? 'user-committee-001' : 'user-ganesha-committee-001';
  const adminUserId = isSv ? 'user-admin-001' : 'user-ganesha-admin-001';
  const primarySlug = isGanesha ? 'executive' : 'governance';
  const primaryCommitteeId = committeeIdFor(tenantId, primarySlug);

  const memberRepo = ds.getRepository(CommitteeMemberEntity);
  const blockRepo = ds.getRepository(CommitteeCalendarBlockEntity);
  const taskRepo = ds.getRepository(CommitteeTaskEntity);
  const targetRepo = ds.getRepository(CommitteeTargetEntity);
  const messageRepo = ds.getRepository(CommitteeMessageEntity);
  const leadershipRepo = ds.getRepository(CommitteeLeadershipEntity);
  const reportRepo = ds.getRepository(CommitteeReportEntity);
  const requestRepo = ds.getRepository(CommitteeRequestEntity);

  for (const def of seeds) {
    const committeeId = committeeIdFor(tenantId, def.slug);
    await committeeRepo.save(
      committeeRepo.create({
        id: committeeId,
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
      }),
    );

    const nameCounts = new Map<string, number>();
    const members: CommitteeMemberEntity[] = [];
    def.members.forEach((raw, index) => {
      const parsed = parseMember(raw);
      const count = (nameCounts.get(parsed.name) ?? 0) + 1;
      nameCounts.set(parsed.name, count);
      const suffix = count > 1 ? `-${count}` : '';
      const isSvDemoMember = isSv && def.slug === primarySlug && parsed.name === 'Committee Member Raj';
      const memberKey = `${committeeId}-member-${index}`;

      members.push(
        memberRepo.create({
          id: seedUuid(memberKey),
          committeeId,
          userId: isSvDemoMember
            ? committeeUserId
            : `roster-${def.slug}-${slugify(parsed.name)}${suffix}`,
          name: parsed.name,
          email: isSvDemoMember ? 'committee@svtemple.org' : undefined,
          role: parsed.role,
          displayTitle: parsed.displayTitle,
          photoUrl: isGanesha ? lookupGaneshaCommitteePhoto(parsed.name) : undefined,
          joinedAt: now,
          isActive: true,
          createdAt: now,
        }),
      );
    });
    await memberRepo.save(members);

    if (def.slug === primarySlug && isGanesha) {
      await memberRepo.save(
        memberRepo.create({
          id: seedUuid(`${committeeId}-member-demo-user`),
          committeeId,
          userId: committeeUserId,
          name: 'Committee Member Priya',
          email: 'committee@sgtemple.org',
          role: 'member',
          joinedAt: now,
          isActive: true,
          createdAt: now,
        }),
      );
    }
  }

  await taskRepo.save(
    taskRepo.create({
      id: seedUuid(`${primaryCommitteeId}-task-001`),
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
    }),
  );

  await targetRepo.save(
    targetRepo.create({
      id: seedUuid(`${primaryCommitteeId}-target-001`),
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
    }),
  );

  const year = now.getFullYear();
  const dateAt = (monthOffset: number, day: number) =>
    new Date(year, now.getMonth() + monthOffset, day).toISOString().slice(0, 10);

  await blockRepo.save([
    blockRepo.create({
      id: seedUuid(`${primaryCommitteeId}-block-001`),
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
    }),
    blockRepo.create({
      id: seedUuid(`${primaryCommitteeId}-block-002`),
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
    }),
    blockRepo.create({
      id: seedUuid(`${primaryCommitteeId}-block-personal-001`),
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
    }),
    blockRepo.create({
      id: seedUuid(`${primaryCommitteeId}-block-temple-002`),
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
    }),
  ]);

  await messageRepo.save(
    messageRepo.create({
      id: seedUuid(`${primaryCommitteeId}-msg-001`),
      committeeId: primaryCommitteeId,
      authorUserId: adminUserId,
      authorName: isSv ? 'Temple Admin' : 'HCC Admin',
      subject: isGanesha
        ? 'Welcome to the Executive Committee'
        : 'Welcome to the governance committee',
      body: 'Please review the quarterly targets and submit any calendar block requests before month end.',
      isAnnouncement: true,
      createdAt: now,
    }),
  );

  const lastYear = now.getFullYear() - 1;
  await leadershipRepo.save(
    leadershipRepo.create({
      id: `${primaryCommitteeId}-lead-001`,
      committeeId: primaryCommitteeId,
      name: isGanesha ? 'Arul Nayagadurai' : 'Former Chair Patel',
      role: 'chair',
      displayTitle: 'Chair',
      startDate: `${lastYear}-01-01`,
      endDate: `${lastYear}-12-31`,
      createdAt: now,
      updatedAt: now,
    }),
  );

  await reportRepo.save([
    reportRepo.create({
      id: `${primaryCommitteeId}-report-001`,
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
    }),
    reportRepo.create({
      id: `${primaryCommitteeId}-report-002`,
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
    }),
  ]);

  if (isGanesha) {
    const itCommitteeId = committeeIdFor(tenantId, 'it');
    const eduCommitteeId = committeeIdFor(tenantId, 'education');

    await memberRepo.save([
      memberRepo.create({
        id: seedUuid(`${itCommitteeId}-member-demo-user`),
        committeeId: itCommitteeId,
        userId: committeeUserId,
        name: 'Committee Member Priya',
        email: 'committee@sgtemple.org',
        role: 'vice_chair',
        displayTitle: 'Co-Chair',
        joinedAt: now,
        isActive: true,
        createdAt: now,
      }),
      memberRepo.create({
        id: seedUuid(`${eduCommitteeId}-member-demo-user`),
        committeeId: eduCommitteeId,
        userId: committeeUserId,
        name: 'Committee Member Priya',
        email: 'committee@sgtemple.org',
        role: 'member',
        joinedAt: now,
        isActive: true,
        createdAt: now,
      }),
    ]);

    await taskRepo.save([
      taskRepo.create({
        id: seedUuid(`${itCommitteeId}-task-demo-001`),
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
      }),
      taskRepo.create({
        id: seedUuid(`${itCommitteeId}-task-open-001`),
        committeeId: itCommitteeId,
        title: 'Document AV setup for main hall',
        description: 'Inventory projectors, microphones, and HDMI routing for priest events.',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 21).toISOString().slice(0, 10),
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      }),
      taskRepo.create({
        id: seedUuid(`${itCommitteeId}-task-blocked-001`),
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
      }),
      taskRepo.create({
        id: seedUuid(`${eduCommitteeId}-task-demo-001`),
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
      }),
      taskRepo.create({
        id: seedUuid(`${eduCommitteeId}-task-open-001`),
        committeeId: eduCommitteeId,
        title: 'Recruit summer camp volunteers',
        description: 'Reach out to youth group parents and confirm volunteer shifts.',
        status: 'todo',
        priority: 'high',
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5).toISOString().slice(0, 10),
        createdByUserId: adminUserId,
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    await blockRepo.save([
      blockRepo.create({
        id: seedUuid(`${eduCommitteeId}-block-demo-001`),
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
      }),
      blockRepo.create({
        id: seedUuid(`${itCommitteeId}-block-demo-001`),
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
      }),
      blockRepo.create({
        id: seedUuid(`${itCommitteeId}-block-personal-001`),
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
      }),
      blockRepo.create({
        id: seedUuid(`${eduCommitteeId}-block-personal-001`),
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
      }),
    ]);

    await requestRepo.save([
      requestRepo.create({
        id: seedUuid(`${itCommitteeId}-request-demo-001`),
        committeeId: itCommitteeId,
        type: 'budget',
        title: 'Network hardware refresh quote',
        description: 'Approve vendor quote for six wireless access points and cabling.',
        status: 'pending',
        requestedByUserId: 'roster-it-manohar-gudivada',
        requestedByName: 'Manohar Gudivada',
        createdAt: now,
        updatedAt: now,
      }),
      requestRepo.create({
        id: seedUuid(`${itCommitteeId}-request-leave-001`),
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
      }),
      requestRepo.create({
        id: seedUuid(`${eduCommitteeId}-request-leave-001`),
        committeeId: eduCommitteeId,
        type: 'leave',
        title: 'Summer travel — limited availability',
        description: 'Personal travel; will check email weekly.',
        status: 'pending',
        requestedByUserId: committeeUserId,
        requestedByName: 'Committee Member Priya',
        blockStartDate: dateAt(3, 18),
        blockEndDate: dateAt(3, 22),
        blockTitle: 'Leave — Committee Member Priya',
        createdAt: now,
        updatedAt: now,
      }),
    ]);
  }

  if (isSv) {
    const financeCommitteeId = committeeIdFor(tenantId, 'finance');
    await memberRepo.save(
      memberRepo.create({
        id: seedUuid(`${financeCommitteeId}-member-demo-user`),
        committeeId: financeCommitteeId,
        userId: committeeUserId,
        name: 'Committee Member Raj',
        email: 'committee@svtemple.org',
        role: 'member',
        joinedAt: now,
        isActive: true,
        createdAt: now,
      }),
    );

    await taskRepo.save(
      taskRepo.create({
        id: seedUuid(`${financeCommitteeId}-task-demo-001`),
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
      }),
    );
  }
}
