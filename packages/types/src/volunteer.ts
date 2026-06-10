export type VolunteerShiftRole =
  | 'general'
  | 'kitchen'
  | 'parking'
  | 'setup'
  | 'crowd'
  | 'kids'
  | 'decoration'
  | 'cultural'
  | 'priest_assist';

export type VolunteerCategory =
  | 'festival'
  | 'pooja'
  | 'annadanam'
  | 'setup'
  | 'cultural'
  | 'general';

export type VolunteerSignupStatus = 'confirmed' | 'waitlisted';

export type VolunteerBadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface VolunteerSignup {
  userId: string;
  userName: string;
  signedUpAt: string;
  status?: VolunteerSignupStatus;
  waitlistPosition?: number;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedOut?: boolean;
  checkedOutAt?: string;
  hoursLogged?: number;
}

export interface VolunteerShift {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: number;
  signups: VolunteerSignup[];
  description?: string;
  location?: string;
  role?: VolunteerShiftRole;
  eventId?: string;
  eventName?: string;
  coordinator?: string;
  category?: VolunteerCategory;
  isRecurringTemplate?: boolean;
  templateKey?: string;
}

export interface CreateVolunteerShiftInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: number;
  description?: string;
  location?: string;
  role?: VolunteerShiftRole;
  eventId?: string;
  eventName?: string;
  coordinator?: string;
  category?: VolunteerCategory;
  isRecurringTemplate?: boolean;
  templateKey?: string;
}

export interface VolunteerRoleNeed {
  role: VolunteerShiftRole;
  slotsNeeded: number;
  description?: string;
}

export interface VolunteerOpportunity {
  eventId: string;
  eventName: string;
  category: VolunteerCategory;
  startDate: string;
  endDate: string;
  stage: string;
  volunteersNeeded: number;
  shiftsTotal: number;
  shiftsOpen: number;
  slotsTotal: number;
  slotsFilled: number;
  slotsRemaining: number;
  roles: VolunteerRoleNeed[];
}

export interface VolunteerPreferences {
  userId: string;
  categories: VolunteerCategory[];
  roles: VolunteerShiftRole[];
  notifyNewOpportunities: boolean;
}

export interface GenerateEventShiftsResult {
  eventId: string;
  created: VolunteerShift[];
}

export type VolunteerNotifyAudience = 'interested' | 'assigned';

export interface NotifyEventVolunteersResult {
  eventId: string;
  audience: VolunteerNotifyAudience;
  notified: number;
  inApp: number;
  email: number;
}

export interface VolunteerStats {
  hoursThisQuarter: number;
  hoursYtd: number;
  upcomingShifts: number;
  completedShifts: number;
  waitlistedShifts: number;
  badgeTier: VolunteerBadgeTier;
  nextBadgeAtHours?: number;
  progressToNextBadge: number;
}
