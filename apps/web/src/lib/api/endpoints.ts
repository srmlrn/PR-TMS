import type {
  Booking,
  Devotee,
  DevoteeLookupResult,
  DonationCampaign,
  EventLifecycleStage,
  FinanceSummary,
  PaginatedResponse,
  PrasadamSponsorship,
  QueueStats,
  QueueToken,
  RentalAsset,
  RentalOrder,
  SevaService,
  Sponsor,
  TaxComplianceStatus,
  TempleEvent,
  Tenant,
  TenantEnvironmentRecord,
  VendorPayment,
} from '@tms/types';
import type { ApiClient } from './client';

export type EventPipeline = Record<EventLifecycleStage, TempleEvent[]>;

export interface ListParams extends Record<string, string | number | boolean | undefined> {
  page?: number;
  limit?: number;
  devoteeId?: string;
  date?: string;
  name?: string;
  phone?: string;
}

export interface ServiceSlotsResponse {
  serviceId: string;
  date: string;
  slots: { startTime: string; endTime: string; available: boolean }[];
}

export interface EnvironmentUsage {
  environmentId: string;
  env: string;
  metrics: Record<string, number>;
  estimatedCostUsd: number;
}

export function createEndpoints(client: ApiClient) {
  return {
    getFinanceSummary: () => client.get<FinanceSummary>('/finance/summary'),

    getVendorPayments: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<VendorPayment>>('/finance/vendor-payments', { params }),

    getTaxCompliance: () => client.get<TaxComplianceStatus[]>('/finance/tax-compliance'),

    getBookings: (params?: ListParams) =>
      client.get<PaginatedResponse<Booking>>('/bookings', { params }),

    createBooking: (body: {
      devoteeId: string;
      serviceId: string;
      scheduledAt: string;
      channel?: string;
      sankalpa?: {
        sponsorName: string;
        gotram?: string;
        nakshatra?: string;
        occasion?: string;
        beneficiaryName?: string;
      };
    }) => client.post<Booking>('/bookings', body),

    getServices: () => client.get<SevaService[]>('/services'),

    getServiceSlots: (serviceId: string, date: string) =>
      client.get<ServiceSlotsResponse>(`/services/${serviceId}/slots`, {
        params: { date },
      }),

    getDevotees: (params?: Pick<ListParams, 'page' | 'limit' | 'name' | 'phone'>) =>
      client.get<PaginatedResponse<Devotee>>('/devotees', { params }),

    createDevotee: (body: {
      firstName: string;
      lastName: string;
      email?: string;
      phone: string;
      country: string;
      gotram?: string;
      nakshatra?: string;
    }) => client.post<Devotee>('/devotees', body),

    updateDevotee: (
      id: string,
      body: Partial<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        gotram: string;
        nakshatra: string;
        status: string;
      }>,
    ) => client.patch<Devotee>(`/devotees/${id}`, body),

    getEventPipeline: () => client.get<EventPipeline>('/events/pipeline'),

    getEvents: (params?: { page?: number; limit?: number; stage?: EventLifecycleStage }) =>
      client.get<PaginatedResponse<TempleEvent>>('/events', { params }),

    getRentalOrders: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<RentalOrder>>('/rental-orders', { params }),

    getRentalAssets: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<RentalAsset>>('/rental-assets', { params }),

    getSponsors: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<Sponsor>>('/sponsors', { params }),

    getPrasadamSponsorships: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<PrasadamSponsorship>>('/prasadam/sponsorships', {
        params,
      }),

    getCampaigns: () => client.get<DonationCampaign[]>('/campaigns'),

    createDonation: (body: {
      devoteeId: string;
      amount: number;
      currency: string;
      purpose: string;
      frequency?: string;
      campaignId?: string;
      taxId?: string;
    }) => client.post('/donations', body),

    frontDeskLookup: (phone: string) =>
      client.get<DevoteeLookupResult>('/frontdesk/lookup', { params: { phone } }),

    issueToken: (body: { devoteeId?: string; devoteeName?: string }) =>
      client.post<QueueToken>('/frontdesk/tokens', body),

    getQueueStats: () => client.get<QueueStats>('/frontdesk/queue-stats'),

    listTenants: () => client.get<Tenant[]>('/platform/tenants'),

    getTenantEnvironments: (tenantId: string) =>
      client.get<TenantEnvironmentRecord[]>(`/platform/tenants/${tenantId}/environments`),

    getTenantUsage: (tenantId: string) =>
      client.get<EnvironmentUsage[]>(`/platform/tenants/${tenantId}/usage`),
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;

export function formatMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
