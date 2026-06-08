import type {
  Committee,
  CommitteeCalendarBlock,
  CommitteeDashboard,
  CommitteeRequest,
  CommitteeTask,
  NotificationTemplate,
  Staff,
} from '@tms/types';

export const DEMO_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'reminder-birthday',
    channel: 'sms',
    name: 'Birthday reminder',
    body: 'Happy birthday {{name}}! May the divine bless you on this special day.',
  },
  {
    id: 'booking-confirmed',
    channel: 'email',
    name: 'Booking confirmation',
    subject: 'Seva booking confirmed — {{service}}',
    body: 'Dear {{name}},\n\nYour seva booking for {{service}} on {{date}} is confirmed.',
  },
  {
    id: 'donation-receipt',
    channel: 'email',
    name: 'Donation receipt',
    subject: 'Thank you for your donation',
    body: 'Dear {{name}},\n\nWe received your donation of {{amount}}.',
  },
];

export const DEMO_STAFF: Staff[] = [
  {
    id: 'demo-priest-1',
    name: 'Sri Raman',
    role: 'priest',
    email: 'priest@svtemple.org',
    title: 'Head Priest',
    department: 'Rituals',
    isActive: true,
  },
  {
    id: 'demo-priest-2',
    name: 'Swami Venkat',
    role: 'priest',
    email: 'venkat@svtemple.org',
    department: 'Rituals',
    isActive: true,
  },
];

export function demoCommitteeDashboard(templeName: string): CommitteeDashboard {
  const committee: Committee = {
    id: 'demo-committee',
    name: `${templeName} Governance Committee`,
    slug: 'governance',
    description: 'Finance, events, and facilities oversight',
    purpose: 'Temple governance and approvals',
    category: 'governance',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const myTasks: CommitteeTask[] = [
    {
      id: 'demo-task-1',
      committeeId: committee.id,
      title: 'Review Q2 budget',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-task-2',
      committeeId: committee.id,
      title: 'Approve festival vendor list',
      status: 'todo',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const pendingApprovals: CommitteeRequest[] = [
    {
      id: 'demo-req-1',
      committeeId: committee.id,
      title: 'Hall rental — community event',
      type: 'event',
      status: 'pending',
      requestedByUserId: 'user-committee-001',
      requestedByName: 'Committee Member',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const upcomingBlocks: CommitteeCalendarBlock[] = [
    {
      id: 'demo-block-1',
      committeeId: committee.id,
      title: 'Monthly board meeting',
      startDate: today,
      endDate: today,
      blockType: 'temple',
      blocksTempleCalendar: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-block-2',
      committeeId: committee.id,
      title: 'Volunteer orientation',
      startDate: today,
      endDate: today,
      blockType: 'committee',
      blocksTempleCalendar: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    committees: [committee],
    myTasks,
    pendingApprovals,
    upcomingBlocks,
    stats: {
      totalCommittees: 1,
      openTasks: myTasks.length,
      pendingRequests: pendingApprovals.length,
      upcomingBlocks: upcomingBlocks.length,
    },
  };
}
