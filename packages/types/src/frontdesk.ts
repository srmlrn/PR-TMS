import { TenantScoped, Timestamps } from './common';

export type QueueType = 'darshan' | 'seva' | 'priority';
export type QueueTokenStatus = 'waiting' | 'called' | 'served';

export interface QueueToken extends TenantScoped, Timestamps {
  id: string;
  tokenNumber: string;
  devoteeId?: string;
  devoteeName?: string;
  position: number;
  queueSize: number;
  estimatedWaitMinutes: number;
  status: QueueTokenStatus;
  queueType?: QueueType;
  priority?: boolean;
}

export interface DevoteeTodayBooking {
  id: string;
  serviceId: string;
  scheduledAt: string;
  status: string;
  checkedIn?: boolean;
}

export interface DevoteeLookupMatch {
  id: string;
  name: string;
  phone: string;
  gotram?: string;
  nakshatra?: string;
  membershipTier?: string;
}

export interface DevoteeLookupResult {
  found: boolean;
  /** All matches (up to 10) — pick one to load full profile */
  matches?: DevoteeLookupMatch[];
  devotee?: DevoteeLookupMatch & {
    upcomingBooking?: string;
    todayBookings?: DevoteeTodayBooking[];
    ytdDonations?: { amount: number; currency: string };
  };
}

export interface DevoteeFamilyMember {
  id: string;
  name: string;
  phone: string;
  gotram?: string;
  relationship?: string;
}

export interface DevoteeProfileBooking {
  id: string;
  serviceId: string;
  scheduledAt: string;
  status: string;
  amount: number;
  currency: string;
  channel: string;
  checkedIn?: boolean;
}

export interface DevoteeProfileDonation {
  id: string;
  amount: number;
  currency: string;
  purpose: string;
  createdAt: string;
  receiptNumber?: string;
}

export interface DevoteeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  country: string;
  gotram?: string;
  nakshatra?: string;
  rashi?: string;
  gender?: string;
  dateOfBirth?: string;
  familyId?: string;
  membershipTier?: string;
  membershipExpiresAt?: string;
  status: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  ytdDonations?: { amount: number; currency: string };
  familyMembers: DevoteeFamilyMember[];
  todayBookings: DevoteeTodayBooking[];
  upcomingBookings: DevoteeProfileBooking[];
  bookingHistory: DevoteeProfileBooking[];
  recentDonations: DevoteeProfileDonation[];
}

export interface QueueStats {
  inQueue: number;
  averageWaitMinutes: number;
  servedToday: number;
  calledNow?: number;
}

export interface IssueTokenInput {
  devoteeId?: string;
  devoteeName?: string;
  queueType?: QueueType;
  priority?: boolean;
}

export interface NowServing {
  tokenNumber: string;
  devoteeName?: string;
  queueType: QueueType;
  status: QueueTokenStatus;
}

export interface DisplayBoardToken {
  tokenNumber: string;
  priority?: boolean;
  position?: number;
  estimatedWaitMinutes?: number;
}

export interface DisplayBoardLane {
  queueType: QueueType;
  counterLabel: string;
  nowServing?: DisplayBoardToken;
  upNext: DisplayBoardToken[];
}

export interface DisplayBoard {
  tenantName: string;
  tenantIcon?: string;
  tenantLogoSrc?: string;
  tenantLogoBg?: string;
  tenantLocation?: string;
  hideNames: boolean;
  updatedAt: string;
  stats: QueueStats;
  lanes: DisplayBoardLane[];
  announcements: string[];
}
