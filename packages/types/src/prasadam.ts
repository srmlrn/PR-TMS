import { Currency, PrasadamPackageTier, PrasadamSponsorshipType } from './enums';
import { Sankalpa, TenantScoped, Timestamps } from './common';

export interface PrasadamSponsorship extends TenantScoped, Timestamps {
  id: string;
  type: PrasadamSponsorshipType;
  packageTier: PrasadamPackageTier;
  sponsorId?: string;
  devoteeId: string;
  scheduledDate: Date;
  deity: string;
  amount: number;
  currency: Currency;
  sankalpa: Sankalpa;
  receiptNumber?: string;
  kitchenOrderId?: string;
  courierTrackingId?: string;
  status: 'booked' | 'kitchen_pending' | 'prepared' | 'distributed' | 'dispatched';
}

export interface PrasadamSlotAvailability {
  date: string;
  type: PrasadamSponsorshipType;
  deity: string;
  isAvailable: boolean;
  sponsoredBy?: string;
}

export interface CreatePrasadamSponsorshipInput {
  type: PrasadamSponsorshipType;
  packageTier: PrasadamPackageTier;
  devoteeId: string;
  scheduledDate: string;
  deity: string;
  sankalpa: Sankalpa;
  courierAddress?: string;
}
