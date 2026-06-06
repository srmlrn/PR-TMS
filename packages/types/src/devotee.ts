import { Currency } from './enums';
import { Address, TenantScoped, Timestamps } from './common';

export interface Devotee extends TenantScoped, Timestamps {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  country: string;
  gotram?: string;
  nakshatra?: string;
  membershipTier?: string;
  membershipExpiresAt?: Date;
  ytdDonations?: { amount: number; currency: Currency };
  status: 'active' | 'inactive' | 'renewal_due';
  address?: Address;
}

export interface CreateDevoteeInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  country: string;
  gotram?: string;
  nakshatra?: string;
}
