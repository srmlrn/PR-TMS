import { Sankalpa, TenantScoped, Timestamps } from './common';

export type SevaSubscriptionFrequency = 'monthly' | 'annual';

export type SevaSubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface SevaSubscription extends TenantScoped, Timestamps {
  id: string;
  devoteeId: string;
  serviceId: string;
  frequency: SevaSubscriptionFrequency;
  status: SevaSubscriptionStatus;
  nextDate: Date;
  sankalpa?: Partial<Sankalpa>;
}

export interface CreateSevaSubscriptionInput {
  devoteeId: string;
  serviceId: string;
  frequency: SevaSubscriptionFrequency;
  nextDate: string;
  sankalpa?: Partial<Sankalpa>;
}

export interface UpdateSevaSubscriptionInput {
  frequency?: SevaSubscriptionFrequency;
  status?: SevaSubscriptionStatus;
  nextDate?: string;
  sankalpa?: Partial<Sankalpa>;
}
