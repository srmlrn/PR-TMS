import { Currency, SponsorPipelineStage, SponsorTier } from './enums';
import { TenantScoped, Timestamps } from './common';

export interface Sponsor extends TenantScoped, Timestamps {
  id: string;
  name: string;
  type: 'individual' | 'family' | 'community' | 'corporate' | 'programme';
  tier: SponsorTier;
  pipelineStage: SponsorPipelineStage;
  primaryContact: string;
  email?: string;
  phone?: string;
  committedAmount: number;
  paidAmount: number;
  currency: Currency;
  renewsAt?: Date;
  relationshipManager?: string;
}

export interface RecognitionItem extends TenantScoped {
  id: string;
  sponsorId: string;
  item: string;
  isFulfilled: boolean;
  fulfilledAt?: Date;
}

export interface CreateSponsorInput {
  name: string;
  type: Sponsor['type'];
  tier: SponsorTier;
  primaryContact: string;
  email?: string;
  phone?: string;
  committedAmount: number;
  currency: Currency;
}
