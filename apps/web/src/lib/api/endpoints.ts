import type {
  Booking,
  Devotee,
  DevoteeDuplicateCheck,
  DevoteeGender,
  DevoteeLookupResult,
  DonationCampaign,
  EventLifecycleStage,
  FinanceSummary,
  FxRates,
  ImportantDate,
  PaginatedResponse,
  PaymentProvider,
  PaymentSession,
  PrasadamSponsorship,
  PrasadamSponsorshipType,
  PrasadamPackageTier,
  QueueStats,
  QueueToken,
  RentalAsset,
  RentalOrder,
  SevaService,
  Sponsor,
  SponsorPipelineStage,
  SponsorTier,
  TaxComplianceStatus,
  TaxReceipt,
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

export interface DevoteeFormBody {
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
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export function createEndpoints(client: ApiClient) {
  return {
    getFinanceSummary: () => client.get<FinanceSummary>('/finance/summary'),

    getVendorPayments: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<VendorPayment>>('/finance/vendor-payments', { params }),

    getTaxCompliance: () => client.get<TaxComplianceStatus[]>('/finance/tax-compliance'),

    getFxRates: () => client.get<FxRates>('/payments/fx-rates'),

    createPaymentSession: (body: {
      amount: number;
      currency: string;
      provider: PaymentProvider;
      purpose: string;
      devoteeId?: string;
      metadata?: Record<string, string>;
    }) => client.post<PaymentSession>('/payments/sessions', body),

    confirmPaymentSession: (id: string) =>
      client.post<PaymentSession>(`/payments/sessions/${id}/confirm`, {}),

    getBookings: (params?: ListParams) =>
      client.get<PaginatedResponse<Booking>>('/bookings', { params }),

    updateBookingStatus: (id: string, status: string) =>
      client.patch<Booking>(`/bookings/${id}/status`, { status }),

    getBookingReceipt: (id: string) =>
      client.get<TaxReceipt>(`/bookings/${id}/receipt`),

    getHonorarium: (date?: string) =>
      client.get<{ date: string; total: number; currency: string }>(
        '/bookings/honorarium',
        { params: date ? { date } : undefined },
      ),

    createBooking: (body: {
      devoteeId: string;
      serviceId: string;
      scheduledAt: string;
      channel?: string;
      paymentSessionId?: string;
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

    getDevotee: (id: string) => client.get<Devotee>(`/devotees/${id}`),

    checkDevoteeDuplicate: (params: { phone?: string; email?: string }) =>
      client.get<DevoteeDuplicateCheck>('/devotees/check-duplicate', { params }),

    createDevotee: (body: DevoteeFormBody) => client.post<Devotee>('/devotees', body),

    updateDevotee: (id: string, body: Partial<DevoteeFormBody & { status?: string; membershipTier?: string }>) =>
      client.patch<Devotee>(`/devotees/${id}`, body),

    getEventPipeline: () => client.get<EventPipeline>('/events/pipeline'),

    getEvents: (params?: { page?: number; limit?: number; stage?: EventLifecycleStage }) =>
      client.get<PaginatedResponse<TempleEvent>>('/events', { params }),

    createEvent: (body: {
      name: string;
      type: TempleEvent['type'];
      startDate: string;
      endDate: string;
      venues: string[];
      expectedFootfall?: number;
      budgetPlanned?: number;
      revenueTarget?: number;
      clientName?: string;
      clientContact?: string;
    }) => client.post<TempleEvent>('/events', body),

    getRentalOrders: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<RentalOrder>>('/rental-orders', { params }),

    getRentalAssets: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<RentalAsset>>('/rental-assets', { params }),

    getSponsors: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<Sponsor>>('/sponsors', { params }),

    createSponsor: (body: {
      name: string;
      type: Sponsor['type'];
      tier: SponsorTier;
      primaryContact: string;
      email?: string;
      phone?: string;
      committedAmount: number;
      paidAmount?: number;
      currency: string;
      pipelineStage?: SponsorPipelineStage;
      renewsAt?: string;
      relationshipManager?: string;
    }) => client.post<Sponsor>('/sponsors', body),

    getPrasadamSponsorships: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<PrasadamSponsorship>>('/prasadam/sponsorships', {
        params,
      }),

    createPrasadamSponsorship: (body: {
      type: PrasadamSponsorshipType;
      packageTier: PrasadamPackageTier;
      devoteeId: string;
      scheduledDate: string;
      deity: string;
      sankalpa: {
        sponsorName: string;
        gotram?: string;
        nakshatra?: string;
        occasion?: string;
        beneficiaryName?: string;
      };
      sponsorId?: string;
      courierAddress?: string;
      currency?: string;
    }) => client.post<PrasadamSponsorship>('/prasadam/sponsorships', body),

    getCampaigns: () => client.get<DonationCampaign[]>('/campaigns'),

    createDonation: (body: {
      devoteeId: string;
      amount: number;
      currency: string;
      purpose: string;
      frequency?: string;
      campaignId?: string;
      taxId?: string;
      paymentSessionId?: string;
    }) => client.post('/donations', body),

    getDonationReceipt: (id: string) =>
      client.get<TaxReceipt>(`/donations/${id}/receipt`),

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
