export type CommitteeMemberRole = 'chair' | 'vice_chair' | 'secretary' | 'member';

export type CommitteeCategory =
  | 'governance'
  | 'religious'
  | 'cultural'
  | 'education'
  | 'operations'
  | 'outreach'
  | 'staff';

export type CommitteeType = 'standing' | 'ad_hoc' | 'staff';

export type MeetingCadence = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'as_needed';

export type CommitteeReportPeriod = 'monthly' | 'quarterly';

export type CommitteeRequestType =
  | 'calendar_block'
  | 'budget'
  | 'event'
  | 'leave'
  | 'task'
  | 'general';

export type CommitteeRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type CommitteeTaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export type CommitteeTaskPriority = 'low' | 'medium' | 'high';

export type CommitteeTargetPeriod = 'monthly' | 'quarterly' | 'annual';

export interface Committee {
  id: string;
  name: string;
  slug: string;
  description?: string;
  purpose?: string;
  category: CommitteeCategory;
  committeeType: CommitteeType;
  meetingCadence?: MeetingCadence;
  publicRoster: boolean;
  isActive: boolean;
  memberCount?: number;
  /** Present when listing committees for the current user (mine=true) */
  myRole?: CommitteeMemberRole;
  myDisplayTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeMember {
  id: string;
  committeeId: string;
  userId: string;
  name: string;
  email?: string;
  role: CommitteeMemberRole;
  displayTitle?: string;
  photoUrl?: string;
  joinedAt: string;
  isActive: boolean;
}

export type CommitteeCalendarBlockType = 'committee' | 'personal' | 'temple';

export interface CommitteeCalendarBlock {
  id: string;
  committeeId: string;
  title: string;
  startDate: string;
  endDate: string;
  reason?: string;
  blockType: CommitteeCalendarBlockType;
  blocksTempleCalendar: boolean;
  requestId?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeTask {
  id: string;
  committeeId: string;
  title: string;
  description?: string;
  assigneeUserId?: string;
  assigneeName?: string;
  status: CommitteeTaskStatus;
  priority: CommitteeTaskPriority;
  dueDate?: string;
  eventId?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeTarget {
  id: string;
  committeeId: string;
  title: string;
  description?: string;
  period: CommitteeTargetPeriod;
  targetValue: number;
  currentValue: number;
  unit?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeRequest {
  id: string;
  committeeId: string;
  type: CommitteeRequestType;
  title: string;
  description?: string;
  status: CommitteeRequestStatus;
  requestedByUserId: string;
  requestedByName?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewNote?: string;
  eventId?: string;
  /** Calendar block payload when type is calendar_block */
  blockStartDate?: string;
  blockEndDate?: string;
  blockTitle?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export interface CommitteeMessage {
  id: string;
  committeeId: string;
  authorUserId: string;
  authorName?: string;
  subject?: string;
  body: string;
  isAnnouncement: boolean;
  createdAt: string;
}

export interface CommitteeReport {
  id: string;
  committeeId: string;
  period: CommitteeReportPeriod;
  title: string;
  meetingDate: string;
  minutesSummary: string;
  attendanceCount: number;
  expectedAttendance?: number;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeLeadershipRecord {
  id: string;
  committeeId: string;
  name: string;
  role: CommitteeMemberRole;
  displayTitle?: string;
  startDate: string;
  endDate?: string;
}

export interface CommitteeRosterEntry {
  committee: Committee;
  members: CommitteeMember[];
}

export interface CommitteeRosterCategory {
  category: CommitteeCategory;
  label: string;
  committees: CommitteeRosterEntry[];
}

export interface CommitteeRoster {
  categories: CommitteeRosterCategory[];
}

export interface CommitteeTaskBoardSummary {
  counts: {
    available: number;
    todo: number;
    in_progress: number;
    blocked: number;
    done: number;
  };
  openPool: CommitteeTask[];
}

export interface CommitteeDashboard {
  committees: Committee[];
  pendingApprovals: CommitteeRequest[];
  myTasks: CommitteeTask[];
  upcomingBlocks: CommitteeCalendarBlock[];
  taskBoard: CommitteeTaskBoardSummary;
  stats: {
    totalCommittees: number;
    openTasks: number;
    pendingRequests: number;
    upcomingBlocks: number;
    availableTasks: number;
  };
}

export interface CreateCommitteeInput {
  name: string;
  slug?: string;
  description?: string;
  purpose?: string;
  category?: CommitteeCategory;
  committeeType?: CommitteeType;
  meetingCadence?: MeetingCadence;
  publicRoster?: boolean;
}

export interface UpdateCommitteeInput {
  name?: string;
  slug?: string;
  description?: string;
  purpose?: string;
  category?: CommitteeCategory;
  committeeType?: CommitteeType;
  meetingCadence?: MeetingCadence;
  publicRoster?: boolean;
  isActive?: boolean;
}

export interface CreateCommitteeMemberInput {
  userId: string;
  name: string;
  email?: string;
  role: CommitteeMemberRole;
  displayTitle?: string;
  photoUrl?: string;
}

export interface UpdateCommitteeMemberInput {
  name?: string;
  email?: string;
  role?: CommitteeMemberRole;
  displayTitle?: string;
  photoUrl?: string;
  isActive?: boolean;
}

export interface CreateCommitteeReportInput {
  period: CommitteeReportPeriod;
  title: string;
  meetingDate: string;
  minutesSummary: string;
  attendanceCount: number;
  expectedAttendance?: number;
}

export interface CreateCommitteeCalendarBlockInput {
  title: string;
  startDate: string;
  endDate: string;
  reason?: string;
  blockType?: CommitteeCalendarBlockType;
  blocksTempleCalendar?: boolean;
}

export interface UpdateCommitteeCalendarBlockInput {
  title?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  blockType?: CommitteeCalendarBlockType;
  blocksTempleCalendar?: boolean;
}

export interface CreateCommitteeTaskInput {
  title: string;
  description?: string;
  assigneeUserId?: string;
  assigneeName?: string;
  status?: CommitteeTaskStatus;
  priority?: CommitteeTaskPriority;
  dueDate?: string;
  eventId?: string;
}

export interface UpdateCommitteeTaskInput {
  title?: string;
  description?: string;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  status?: CommitteeTaskStatus;
  priority?: CommitteeTaskPriority;
  dueDate?: string | null;
  eventId?: string | null;
}

export interface CreateCommitteeTargetInput {
  title: string;
  description?: string;
  period: CommitteeTargetPeriod;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  dueDate?: string;
}

export interface UpdateCommitteeTargetInput {
  title?: string;
  description?: string;
  period?: CommitteeTargetPeriod;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  dueDate?: string | null;
}

export interface CreateCommitteeRequestInput {
  type: CommitteeRequestType;
  title: string;
  description?: string;
  eventId?: string;
  blockStartDate?: string;
  blockEndDate?: string;
  blockTitle?: string;
}

export interface UpdateCommitteeRequestInput {
  status: CommitteeRequestStatus;
  reviewNote?: string;
}

export interface CreateCommitteeMessageInput {
  subject?: string;
  body: string;
  isAnnouncement?: boolean;
}
