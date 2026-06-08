export type StaffRole = 'priest' | 'frontdesk' | 'volunteer';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  notes?: string;
  userId?: string;
  isActive: boolean;
  /** Set when an approved leave covers today. */
  onLeaveToday?: boolean;
}
