import { Currency } from './enums';
import { Address, TenantScoped, Timestamps } from './common';

export type DevoteeGender = 'male' | 'female' | 'other';

export const DEVOTEE_TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.'] as const;
export type DevoteeTitle = (typeof DEVOTEE_TITLES)[number];

export const PHONE_TYPES = ['cell', 'home', 'work'] as const;
export type PhoneType = (typeof PHONE_TYPES)[number];

export const EMAIL_TYPES = ['home', 'work'] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

export const ADDRESS_TYPES = ['home', 'work'] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

export interface DevoteePhone {
  type: PhoneType;
  number: string;
  primary?: boolean;
}

export interface DevoteeEmail {
  type: EmailType;
  address: string;
  primary?: boolean;
}

export interface DevoteeAddressEntry {
  type: AddressType;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  primary?: boolean;
}

export type ImportantDateType = 'birthday' | 'anniversary' | 'star_day' | 'other';

export interface ImportantDate {
  label: string;
  date: string;
  type: ImportantDateType;
}

export interface DevoteeContactFields {
  title?: DevoteeTitle;
  indiaState?: string;
  phones?: DevoteePhone[];
  emails?: DevoteeEmail[];
  addresses?: DevoteeAddressEntry[];
}

export interface Devotee extends TenantScoped, Timestamps, DevoteeContactFields {
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

export interface CreateDevoteeInput extends DevoteeContactFields {
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

export type UpdateDevoteeInput = Partial<CreateDevoteeInput> & {
  membershipTier?: string;
  membershipExpiresAt?: string;
  status?: Devotee['status'];
};

export interface DevoteeDuplicateCheck {
  phoneMatch?: Pick<Devotee, 'id' | 'firstName' | 'lastName' | 'phone' | 'email'>;
  emailMatch?: Pick<Devotee, 'id' | 'firstName' | 'lastName' | 'phone' | 'email'>;
}

/** POST /devotees — devotee fields plus optional duplicate warning (non-blocking by default). */
export type CreateDevoteeResponse = Devotee & {
  duplicateWarning?: DevoteeDuplicateCheck;
};

export interface DevoteeReminderDue {
  devoteeId: string;
  devoteeName: string;
  phone: string;
  importantDate: ImportantDate;
}

export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function collectPhoneNumbers(input: {
  phone?: string;
  phones?: DevoteePhone[];
}): string[] {
  const nums = new Set<string>();
  if (input.phone?.trim()) {
    nums.add(normalizePhoneNumber(input.phone));
  }
  for (const entry of input.phones ?? []) {
    if (entry.number?.trim()) {
      nums.add(normalizePhoneNumber(entry.number));
    }
  }
  return [...nums];
}

export function collectEmailAddresses(input: {
  email?: string;
  emails?: DevoteeEmail[];
}): string[] {
  const addrs = new Set<string>();
  if (input.email?.trim()) {
    addrs.add(input.email.trim().toLowerCase());
  }
  for (const entry of input.emails ?? []) {
    if (entry.address?.trim()) {
      addrs.add(entry.address.trim().toLowerCase());
    }
  }
  return [...addrs];
}

/** Populate contact arrays from legacy single fields when arrays are empty. */
export function hydrateDevoteeContacts<T extends Partial<Devotee>>(devotee: T): T {
  const phones = [...(devotee.phones ?? [])];
  const emails = [...(devotee.emails ?? [])];
  const addresses = [...(devotee.addresses ?? [])];

  if (phones.length === 0 && devotee.phone?.trim()) {
    phones.push({ type: 'cell', number: devotee.phone, primary: true });
  }
  if (emails.length === 0 && devotee.email?.trim()) {
    emails.push({ type: 'home', address: devotee.email, primary: true });
  }
  if (addresses.length === 0 && devotee.address?.line1) {
    addresses.push({
      type: 'home',
      line1: devotee.address.line1,
      line2: devotee.address.line2,
      city: devotee.address.city,
      state: devotee.address.state,
      postalCode: devotee.address.postalCode,
      country: devotee.address.country,
      primary: true,
    });
  }

  return { ...devotee, phones, emails, addresses };
}

function toAddress(entry: DevoteeAddressEntry, fallbackCountry: string): Address {
  return {
    line1: entry.line1,
    line2: entry.line2,
    city: entry.city ?? '',
    state: entry.state,
    postalCode: entry.postalCode,
    country: entry.country || fallbackCountry,
  };
}

/** Derive legacy primary fields and normalized contact arrays for persistence. */
export function syncPrimaryContacts(
  input: Partial<CreateDevoteeInput>,
): {
  phone: string;
  email?: string;
  address?: Address;
  phones: DevoteePhone[];
  emails: DevoteeEmail[];
  addresses: DevoteeAddressEntry[];
} {
  const phones = (input.phones ?? [])
    .filter((p) => p.number?.trim())
    .map((p) => ({ ...p, number: p.number.trim() }));
  const emails = (input.emails ?? [])
    .filter((e) => e.address?.trim())
    .map((e) => ({ ...e, address: e.address.trim() }));
  const addresses = (input.addresses ?? [])
    .filter((a) => a.line1?.trim())
    .map((a) => ({ ...a, line1: a.line1.trim() }));

  if (input.phone?.trim()) {
    const legacy = input.phone.trim();
    const exists = phones.some(
      (p) => normalizePhoneNumber(p.number) === normalizePhoneNumber(legacy),
    );
    if (!exists) {
      phones.unshift({ type: 'cell', number: legacy, primary: true });
    }
  }

  if (input.email?.trim()) {
    const legacy = input.email.trim();
    const exists = emails.some(
      (e) => e.address.toLowerCase() === legacy.toLowerCase(),
    );
    if (!exists) {
      emails.unshift({ type: 'home', address: legacy, primary: true });
    }
  }

  if (input.address?.line1?.trim()) {
    const legacy = input.address;
    const exists = addresses.some(
      (a) =>
        a.line1 === legacy.line1 &&
        (a.city ?? '') === (legacy.city ?? '') &&
        (a.postalCode ?? '') === (legacy.postalCode ?? ''),
    );
    if (!exists) {
      addresses.unshift({
        type: 'home',
        line1: legacy.line1,
        line2: legacy.line2,
        city: legacy.city ?? '',
        state: legacy.state,
        postalCode: legacy.postalCode,
        country: legacy.country || input.country || 'US',
        primary: true,
      });
    }
  }

  const fallbackCountry = input.country ?? 'US';
  const phone =
    phones.find((p) => p.type === 'cell')?.number ??
    phones.find((p) => p.primary)?.number ??
    phones[0]?.number ??
    input.phone?.trim() ??
    '';
  const email =
    emails.find((e) => e.type === 'home')?.address ??
    emails.find((e) => e.primary)?.address ??
    emails[0]?.address ??
    input.email?.trim();
  const primaryAddr =
    addresses.find((a) => a.type === 'home') ??
    addresses.find((a) => a.primary) ??
    addresses[0];
  const address = primaryAddr
    ? toAddress(primaryAddr, fallbackCountry)
    : input.address?.line1
      ? {
          line1: input.address.line1,
          line2: input.address.line2,
          city: input.address.city ?? '',
          state: input.address.state,
          postalCode: input.address.postalCode,
          country: input.address.country ?? fallbackCountry,
        }
      : undefined;

  return { phone, email, address, phones, emails, addresses };
}
