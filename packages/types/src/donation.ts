import { Currency, DonationFrequency } from './enums';
import { TenantScoped, Timestamps } from './common';

export interface Donation extends TenantScoped, Timestamps {
  id: string;
  devoteeId: string;
  amount: number;
  currency: Currency;
  purpose: string;
  frequency: DonationFrequency;
  receiptNumber: string;
  taxCompliant: boolean;
  taxDocType?: 'irs_501c3' | '80g' | 'cra';
  campaignId?: string;
}

export interface DonationCampaign extends TenantScoped, Timestamps {
  id: string;
  name: string;
  targetAmount: number;
  raisedAmount: number;
  currency: Currency;
  isActive: boolean;
}

export interface CreateDonationInput {
  devoteeId: string;
  amount: number;
  currency: Currency;
  purpose: string;
  frequency?: DonationFrequency;
  campaignId?: string;
}
