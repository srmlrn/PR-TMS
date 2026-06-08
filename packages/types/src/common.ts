import { Currency } from './enums';

export interface TenantScoped {
  tenantId: string;
}

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MoneyAmount {
  amount: number;
  currency: Currency;
}

export interface Sankalpa {
  sponsorName: string;
  /** Shrine / deity for this seva line (counter POS override). */
  deity?: string;
  gotram?: string;
  nakshatra?: string;
  rashi?: string;
  occasion?: string;
  beneficiaryName?: string;
  priestPreference?: string;
  /** Counter POS: on-site temple vs off-site (home) ritual */
  location?: 'on_site' | 'off_site';
  quantity?: number;
  notes?: string;
  /** Participating remotely (live stream / proxy ritual). */
  remoteParticipation?: boolean;
  /** Comma-separated names of additional beneficiaries. */
  additionalBeneficiaries?: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}
