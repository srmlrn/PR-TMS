export type CommitteeMemberRole = 'chair' | 'vice_chair' | 'secretary' | 'member';

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
  description?: string;
  purpose?: string;
  isActive: boolean;
  memberCount?: number;
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
  joinedAt: string;
  isActive: boolean;
}

export interface CommitteeCalendarBlock {
  id: string;
  committeeId: string;
  title: string;
  startDate: string;
  endDate: string;
  reason?: string;
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

export interface CommitteeDashboard {
  committees: Committee[];
  pendingApprovals: CommitteeRequest[];
  myTasks: CommitteeTask[];
  upcomingBlocks: CommitteeCalendarBlock[];
  stats: {
    totalCommittees: number;
    openTasks: number;
    pendingRequests: number;
    upcomingBlocks: number;
  };
}

export interface CreateCommitteeInput {
  name: string;
  description?: string;
  purpose?: string;
}

export interface UpdateCommitteeInput {
  name?: string;
  description?: string;
  purpose?: string;
  isActive?: boolean;
}

export interface CreateCommitteeMemberInput {
  userId: string;
  name: string;
  email?: string;
  role: CommitteeMemberRole;
}

export interface UpdateCommitteeMemberInput {
  name?: string;
  email?: string;
  role?: CommitteeMemberRole;
  isActive?: boolean;
}

export interface CreateCommitteeCalendarBlockInput {
  title: string;
  startDate: string;
  endDate: string;
  reason?: string;
  blocksTempleCalendar?: boolean;
}

export interface UpdateCommitteeCalendarBlockInput {
  title?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
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
