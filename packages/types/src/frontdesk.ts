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

export interface DevoteeLookupResult {
  found: boolean;
  devotee?: {
    id: string;
    name: string;
    phone: string;
    gotram?: string;
    nakshatra?: string;
    membershipTier?: string;
    upcomingBooking?: string;
    todayBookings?: DevoteeTodayBooking[];
    ytdDonations?: { amount: number; currency: string };
  };
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
