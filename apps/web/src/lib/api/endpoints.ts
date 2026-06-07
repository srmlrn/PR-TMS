import type {
  Booking,
  CreateBookingInput,
  CreateDonationInput,
  DashboardAnalytics,
  Donation,
  Devotee,
  DevoteeDuplicateCheck,
  DevoteeGender,
  DevoteeLookupResult,
  DevoteeProfile,
  DonationCampaign,
  EventChecklistItem,
  EventLifecycleStage,
  FinanceSummary,
  FxRates,
  ImportantDate,
  PaginatedResponse,
  PaymentProvider,
  PaymentSession,
  PosCheckoutInput,
  PosCheckoutResult,
  PrasadamSlotAvailability,
  PrasadamSponsorship,
  PrasadamSponsorshipType,
  PrasadamPackageTier,
  DisplayBoard,
  NowServing,
  QueueStats,
  QueueToken,
  RecognitionItem,
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
  Staff,
  VolunteerShift,
  CreateVolunteerShiftInput,
  VolunteerStats,
  VolunteerOpportunity,
  VolunteerCategory,
  VolunteerPreferences,
  GenerateEventShiftsResult,
  InAppNotification,
} from '@tms/types';
import type { ApiClient } from './client';

export type EventPipeline = Record<EventLifecycleStage, TempleEvent[]>;

export interface EventBudgetSnapshot {
  eventId: string;
  plannedBudget: number;
  revenueTarget: number;
  income: {
    donations: number;
    bookings: number;
    sponsorships: number;
    total: number;
  };
  expenses: {
    catering: number;
    avEquipment: number;
    decoration: number;
    total: number;
  };
  netSurplus: number;
}

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
  membershipTier?: string;
  membershipExpiresAt?: string;
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

    getDashboardAnalytics: () =>
      client.get<DashboardAnalytics>('/analytics/dashboard'),

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

    getPaymentSession: (id: string) =>
      client.get<PaymentSession>(`/payments/sessions/${id}`),

    getBookings: (params?: ListParams) =>
      client.get<PaginatedResponse<Booking>>('/bookings', { params }),

    updateBooking: (id: string, body: { priestId?: string }) =>
      client.patch<Booking>(`/bookings/${id}`, body),

    updateBookingStatus: (id: string, status: string) =>
      client.patch<Booking>(`/bookings/${id}/status`, { status }),

    getBookingReceipt: (id: string) =>
      client.get<TaxReceipt>(`/bookings/${id}/receipt`),

    getHonorarium: (date?: string) =>
      client.get<{ date: string; total: number; currency: string }>(
        '/bookings/honorarium',
        { params: date ? { date } : undefined },
      ),

    createBooking: (body: CreateBookingInput) => client.post<Booking>('/bookings', body),

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

    updateDevotee: (id: string, body: Partial<DevoteeFormBody & { status?: Devotee['status'] }>) =>
      client.patch<Devotee>(`/devotees/${id}`, body),

    deleteDevotee: (id: string) =>
      client.delete<{ deleted: true }>(`/devotees/${id}`),

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

    getEvent: (id: string) => client.get<TempleEvent>(`/events/${id}`),

    updateEvent: (id: string, body: Partial<{
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
    }>) => client.patch<TempleEvent>(`/events/${id}`, body),

    updateEventStage: (id: string, stage: EventLifecycleStage) =>
      client.patch<TempleEvent>(`/events/${id}/stage`, { stage }),

    getEventChecklist: (id: string) =>
      client.get<EventChecklistItem[]>(`/events/${id}/checklist`),

    getEventBudget: (id: string) =>
      client.get<EventBudgetSnapshot>(`/events/${id}/budget`),

    getRentalOrders: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<RentalOrder>>('/rental-orders', { params }),

    getRentalAssets: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<RentalAsset>>('/rental-assets', { params }),

    getSponsors: (params?: Pick<ListParams, 'page' | 'limit'> & {
      tier?: SponsorTier;
      pipelineStage?: SponsorPipelineStage;
    }) =>
      client.get<PaginatedResponse<Sponsor>>('/sponsors', { params }),

    getSponsor: (id: string) => client.get<Sponsor>(`/sponsors/${id}`),

    getSponsorsRenewalsDue: () =>
      client.get<{ data: Sponsor[] }>('/sponsors/renewals-due'),

    getSponsorRecognition: (id: string) =>
      client.get<{ data: RecognitionItem[] }>(`/sponsors/${id}/recognition`),

    updateSponsor: (id: string, body: Partial<{
      name: string;
      type: Sponsor['type'];
      tier: SponsorTier;
      pipelineStage: SponsorPipelineStage;
      primaryContact: string;
      email?: string;
      phone?: string;
      committedAmount: number;
      paidAmount?: number;
      currency: string;
      renewsAt?: string;
      relationshipManager?: string;
    }>) => client.patch<Sponsor>(`/sponsors/${id}`, body),

    updateSponsorRecognition: (id: string, itemId: string, isFulfilled: boolean) =>
      client.patch<RecognitionItem>(`/sponsors/${id}/recognition/${itemId}`, {
        isFulfilled,
      }),

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

    getPrasadamAvailability: (params: {
      month: string;
      type?: PrasadamSponsorshipType;
      deity?: string;
      date?: string;
    }) =>
      client.get<{ data: PrasadamSlotAvailability[] }>('/prasadam/availability', {
        params,
      }),

    getPrasadamSponsorships: (params?: Pick<ListParams, 'page' | 'limit'> & {
      type?: PrasadamSponsorshipType;
      scheduledDate?: string;
      deity?: string;
    }) =>
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

    getDonations: (params?: Pick<ListParams, 'page' | 'limit' | 'devoteeId'>) =>
      client.get<PaginatedResponse<Donation>>('/donations', { params }),

    createDonation: (body: CreateDonationInput) => client.post<Donation>('/donations', body),

    getDonationReceipt: (id: string) =>
      client.get<TaxReceipt>(`/donations/${id}/receipt`),

    frontDeskLookup: (params: { phone?: string; name?: string }) =>
      client.get<DevoteeLookupResult>('/frontdesk/lookup', { params }),

    getDevoteeProfile: (id: string) =>
      client.get<DevoteeProfile>(`/frontdesk/devotee-profile/${id}`),

    checkInBooking: (bookingId: string) =>
      client.post<{ checkedIn: true }>('/frontdesk/check-in', { bookingId }),

    getFrontDeskQueue: (params?: {
      status?: 'waiting' | 'called' | 'served';
      queueType?: string;
    }) => client.get<{ data: QueueToken[] }>('/frontdesk/queue', { params }),

    getDisplayBoard: () => client.get<DisplayBoard>('/frontdesk/display-board'),

    getNowServing: () => client.get<{ data: NowServing[] }>('/frontdesk/now-serving'),

    callNextToken: (queueType?: string) =>
      client.post<{ data: QueueToken | null }>('/frontdesk/call-next', {}, {
        params: queueType ? { queueType } : undefined,
      }),

    callQueueToken: (id: string) =>
      client.post<QueueToken>(`/frontdesk/tokens/${id}/call`, {}),

    serveQueueToken: (id: string) =>
      client.post<QueueToken>(`/frontdesk/tokens/${id}/serve`, {}),

    notifyQueueToken: (id: string, phone: string) =>
      client.post<{ sent: boolean; message: string }>(`/frontdesk/tokens/${id}/notify`, {
        phone,
      }),

    issueToken: (body: {
      devoteeId?: string;
      devoteeName?: string;
      queueType?: string;
      priority?: boolean;
    }) => client.post<QueueToken>('/frontdesk/tokens', body),

    getQueueStats: () => client.get<QueueStats>('/frontdesk/queue-stats'),

    posCheckout: (body: PosCheckoutInput) =>
      client.post<PosCheckoutResult>('/frontdesk/pos-checkout', body),

    listTenants: () => client.get<Tenant[]>('/platform/tenants'),

    getTenantEnvironments: (tenantId: string) =>
      client.get<TenantEnvironmentRecord[]>(`/platform/tenants/${tenantId}/environments`),

    getTenantUsage: (tenantId: string) =>
      client.get<EnvironmentUsage[]>(`/platform/tenants/${tenantId}/usage`),

    getStaff: (params?: { role?: Staff['role'] }) =>
      client.get<{ data: Staff[] }>('/staff', { params }),

    getVolunteerShifts: (params?: { category?: VolunteerCategory }) =>
      client.get<{ data: VolunteerShift[] }>('/volunteer/shifts', { params }),

    getVolunteerOpportunities: (params?: { category?: VolunteerCategory }) =>
      client.get<{ data: VolunteerOpportunity[] }>('/volunteer/opportunities', { params }),

    getVolunteerShiftsByEvent: (eventId: string) =>
      client.get<{ data: VolunteerShift[] }>(`/volunteer/shifts/event/${eventId}`),

    getVolunteerRecurringTemplates: () =>
      client.get<{ data: VolunteerShift[] }>('/volunteer/templates'),

    getVolunteerStats: () => client.get<VolunteerStats>('/volunteer/stats'),

    getVolunteerPreferences: () => client.get<VolunteerPreferences>('/volunteer/preferences'),

    updateVolunteerPreferences: (body: Partial<Omit<VolunteerPreferences, 'userId'>>) =>
      client.patch<VolunteerPreferences>('/volunteer/preferences', body),

    createVolunteerShift: (body: CreateVolunteerShiftInput) =>
      client.post<VolunteerShift>('/volunteer/shifts', body),

    generateEventVolunteerShifts: (eventId: string) =>
      client.post<GenerateEventShiftsResult>(`/volunteer/events/${eventId}/generate-shifts`, {}),

    signupVolunteerShift: (id: string) =>
      client.post<VolunteerShift>(`/volunteer/shifts/${id}/signup`, {}),

    cancelVolunteerSignup: (id: string) =>
      client.post<VolunteerShift>(`/volunteer/shifts/${id}/cancel-signup`, {}),

    checkinVolunteerShift: (id: string) =>
      client.post<VolunteerShift>(`/volunteer/shifts/${id}/checkin`, {}),

    checkoutVolunteerShift: (id: string) =>
      client.post<VolunteerShift>(`/volunteer/shifts/${id}/checkout`, {}),

    getInAppNotifications: () =>
      client.get<{ data: InAppNotification[] }>('/notifications/in-app'),

    markInAppNotificationRead: (id: string) =>
      client.patch<InAppNotification>(`/notifications/in-app/${id}/read`, {}),

    markAllInAppNotificationsRead: () =>
      client.patch<{ updated: number }>('/notifications/in-app/read-all', {}),
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
