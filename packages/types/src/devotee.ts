import { Currency } from './enums';
import { Address, TenantScoped, Timestamps } from './common';

export type DevoteeGender = 'male' | 'female' | 'other';

export type ImportantDateType = 'birthday' | 'anniversary' | 'star_day' | 'other';

export interface ImportantDate {
  label: string;
  date: string;
  type: ImportantDateType;
}

export interface Devotee extends TenantScoped, Timestamps {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  country: string;
  gotram?: string;
  nakshatra?: string;
  rashi?: string;
  gender?: DevoteeGender;
  dateOfBirth?: string;
  photoUrl?: string;
  familyId?: string;
  taxId?: string;
  isNri?: boolean;
  communicationOptIn?: boolean;
  preferredLanguage?: string;
  importantDates?: ImportantDate[];
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
  rashi?: string;
  gender?: DevoteeGender;
  dateOfBirth?: string;
  photoUrl?: string;
  familyId?: string;
  taxId?: string;
  isNri?: boolean;
  communicationOptIn?: boolean;
  preferredLanguage?: string;
  importantDates?: ImportantDate[];
  address?: Address;
}

export interface DevoteeDuplicateCheck {
  phoneMatch?: Pick<Devotee, 'id' | 'firstName' | 'lastName' | 'phone' | 'email'>;
  emailMatch?: Pick<Devotee, 'id' | 'firstName' | 'lastName' | 'phone' | 'email'>;
}

/** POST /devotees — devotee fields plus optional duplicate warning (non-blocking by default). */
export type CreateDevoteeResponse = Devotee & {
  duplicateWarning?: DevoteeDuplicateCheck;
};
