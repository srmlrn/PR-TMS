import { Currency, DonationFrequency, PaymentStatus } from './enums';
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
  taxId?: string;
  paymentStatus?: PaymentStatus;
  campaignId?: string;
  isAnonymous?: boolean;
  isInKind?: boolean;
  inKindDescription?: string;
}

export interface DonationSubscription extends TenantScoped, Timestamps {
  id: string;
  devoteeId: string;
  donationId: string;
  amount: number;
  currency: Currency;
  purpose: string;
  frequency: DonationFrequency;
  status: 'active' | 'paused' | 'cancelled';
  nextBillingAt: Date;
  lastPaymentSessionId?: string;
}

export interface DonationCampaign extends TenantScoped, Timestamps {
  id: string;
  name: string;
  targetAmount: number;
  raisedAmount: number;
  currency: Currency;
  isActive: boolean;
}

export interface UpdateDonationSubscriptionInput {
  status?: DonationSubscription['status'];
}

export interface CreateDonationInput {
  devoteeId: string;
  amount: number;
  currency: Currency;
  purpose: string;
  frequency?: DonationFrequency;
  campaignId?: string;
  taxId?: string;
  paymentSessionId?: string;
  isAnonymous?: boolean;
  isInKind?: boolean;
  inKindDescription?: string;
}
