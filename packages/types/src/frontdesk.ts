import { TenantScoped, Timestamps } from './common';

export interface QueueToken extends TenantScoped, Timestamps {
  id: string;
  tokenNumber: string;
  devoteeId?: string;
  devoteeName?: string;
  position: number;
  queueSize: number;
  estimatedWaitMinutes: number;
  status: 'waiting' | 'called' | 'served';
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
  };
}

export interface QueueStats {
  inQueue: number;
  averageWaitMinutes: number;
  servedToday: number;
}

export interface IssueTokenInput {
  devoteeId?: string;
  devoteeName?: string;
}
