import type {
  Booking,
  CreateBookingInput,
  CreateDonationInput,
  DashboardAnalytics,
  Donation,
  DonationSubscription,
  UpdateDonationSubscriptionInput,
  Devotee,
  DevoteeReminderDue,
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
  PosProduct,
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
  StaffLeave,
  StaffLeaveStatus,
  CreateStaffInput,
  UpdateStaffInput,
  CreateStaffLeaveInput,
  UpdateStaffLeaveInput,
  TenantUser,
  CreateTenantUserInput,
  UpdateTenantUserInput,
  VolunteerShift,
  CreateVolunteerShiftInput,
  VolunteerStats,
  VolunteerOpportunity,
  VolunteerCategory,
  VolunteerPreferences,
  VolunteerCertificate,
  GenerateEventShiftsResult,
  NotifyEventVolunteersResult,
  VolunteerNotifyAudience,
  VolunteerRoleNeed,
  InAppNotification,
  NotificationTemplate,
  SendNotificationInput,
  SendNotificationResult,
  SevaSubscription,
  CreateSevaSubscriptionInput,
  UpdateSevaSubscriptionInput,
  Committee,
  CommitteeMember,
  CommitteeCalendarBlock,
  CommitteeTask,
  CommitteeTarget,
  CommitteeRequest,
  CommitteeMessage,
  CommitteeDashboard,
  CommitteeRoster,
  CommitteeReport,
  CommitteeLeadershipRecord,
  CreateCommitteeReportInput,
  CreateCommitteeInput,
  UpdateCommitteeInput,
  CreateCommitteeMemberInput,
  UpdateCommitteeMemberInput,
  CreateCommitteeCalendarBlockInput,
  UpdateCommitteeCalendarBlockInput,
  CreateCommitteeTaskInput,
  UpdateCommitteeTaskInput,
  CreateCommitteeTargetInput,
  UpdateCommitteeTargetInput,
  CreateCommitteeRequestInput,
  UpdateCommitteeRequestInput,
  CreateCommitteeMessageInput,
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

    getSevaSubscriptions: (params?: { devoteeId?: string; status?: string }) =>
      client.get<{ data: SevaSubscription[] }>('/bookings/subscriptions', { params }),

    createSevaSubscription: (body: CreateSevaSubscriptionInput) =>
      client.post<SevaSubscription>('/bookings/subscriptions', body),

    updateSevaSubscription: (id: string, body: UpdateSevaSubscriptionInput) =>
      client.patch<SevaSubscription>(`/bookings/subscriptions/${id}`, body),

    getServices: () => client.get<SevaService[]>('/services'),

    getPosProducts: () => client.get<PosProduct[]>('/catalog/products'),

    getServiceSlots: (serviceId: string, date: string) =>
      client.get<ServiceSlotsResponse>(`/services/${serviceId}/slots`, {
        params: { date },
      }),

    getRemindersDue: (date: string) =>
      client.get<{
        date: string;
        data: DevoteeReminderDue[];
        notificationsQueued: number;
      }>('/devotees/reminders-due', { params: { date } }),

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
      volunteerCategory?: VolunteerCategory;
      volunteersNeeded?: number;
      volunteerRoles?: VolunteerRoleNeed[];
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

    getDonationSubscriptions: (params?: { devoteeId?: string; status?: string }) =>
      client.get<{ data: DonationSubscription[] }>('/donations/subscriptions', { params }),

    updateDonationSubscription: (id: string, body: UpdateDonationSubscriptionInput) =>
      client.patch<DonationSubscription>(`/donations/subscriptions/${id}`, body),

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

    getStaff: (params?: { role?: Staff['role']; includeInactive?: boolean }) =>
      client.get<{ data: Staff[] }>('/staff', { params }),

    getStaffMember: (id: string) => client.get<Staff>(`/staff/${id}`),

    createStaff: (body: CreateStaffInput) => client.post<Staff>('/staff', body),

    updateStaff: (id: string, body: UpdateStaffInput) =>
      client.patch<Staff>(`/staff/${id}`, body),

    deactivateStaff: (id: string) => client.post<Staff>(`/staff/${id}/deactivate`, {}),

    getStaffLeaves: (params?: {
      staffId?: string;
      status?: StaffLeaveStatus;
      from?: string;
      to?: string;
    }) => client.get<{ data: StaffLeave[] }>('/staff/leaves', { params }),

    createStaffLeave: (body: CreateStaffLeaveInput) =>
      client.post<StaffLeave>('/staff/leaves', body),

    updateStaffLeave: (id: string, body: UpdateStaffLeaveInput) =>
      client.patch<StaffLeave>(`/staff/leaves/${id}`, body),

    getTenantUsers: () => client.get<{ data: TenantUser[] }>('/users'),

    createTenantUser: (body: CreateTenantUserInput) =>
      client.post<TenantUser>('/users', body),

    updateTenantUser: (id: string, body: UpdateTenantUserInput) =>
      client.patch<TenantUser>(`/users/${id}`, body),

    getVolunteerShifts: (params?: { category?: VolunteerCategory }) =>
      client.get<{ data: VolunteerShift[] }>('/volunteer/shifts', { params }),

    getVolunteerOpportunities: (params?: { category?: VolunteerCategory }) =>
      client.get<{ data: VolunteerOpportunity[] }>('/volunteer/opportunities', { params }),

    getVolunteerShiftsByEvent: (eventId: string) =>
      client.get<{ data: VolunteerShift[] }>(`/volunteer/shifts/event/${eventId}`),

    getVolunteerRecurringTemplates: () =>
      client.get<{ data: VolunteerShift[] }>('/volunteer/templates'),

    getVolunteerStats: () => client.get<VolunteerStats>('/volunteer/stats'),

    getVolunteerCertificates: () =>
      client.get<{ data: VolunteerCertificate[] }>('/volunteer/certificates'),

    getVolunteerCertificate: (id: string) =>
      client.get<VolunteerCertificate>(`/volunteer/certificates/${id}`),

    getVolunteerPreferences: () => client.get<VolunteerPreferences>('/volunteer/preferences'),

    updateVolunteerPreferences: (body: Partial<Omit<VolunteerPreferences, 'userId'>>) =>
      client.patch<VolunteerPreferences>('/volunteer/preferences', body),

    createVolunteerShift: (body: CreateVolunteerShiftInput) =>
      client.post<VolunteerShift>('/volunteer/shifts', body),

    generateEventVolunteerShifts: (eventId: string) =>
      client.post<GenerateEventShiftsResult>(`/volunteer/events/${eventId}/generate-shifts`, {}),

    notifyEventVolunteers: (eventId: string, body?: { audience?: VolunteerNotifyAudience }) =>
      client.post<NotifyEventVolunteersResult>(`/volunteer/events/${eventId}/notify`, body ?? {}),

    signupVolunteerShift: (id: string) =>
      client.post<VolunteerShift>(`/volunteer/shifts/${id}/signup`, {}),

    cancelVolunteerSignup: (id: string) =>
      client.post<VolunteerShift>(`/volunteer/shifts/${id}/cancel-signup`, {}),

    checkinVolunteerShift: (id: string) =>
      client.post<VolunteerShift>(`/volunteer/shifts/${id}/checkin`, {}),

    checkoutVolunteerShift: (id: string) =>
      client.post<VolunteerShift>(`/volunteer/shifts/${id}/checkout`, {}),

    getNotificationTemplates: () =>
      client.get<NotificationTemplate[]>('/notifications/templates'),

    sendNotification: (body: SendNotificationInput) =>
      client.post<SendNotificationResult>('/notifications/send', body),

    getInAppNotifications: () =>
      client.get<{ data: InAppNotification[] }>('/notifications/in-app'),

    markInAppNotificationRead: (id: string) =>
      client.patch<InAppNotification>(`/notifications/in-app/${id}/read`, {}),

    markAllInAppNotificationsRead: () =>
      client.patch<{ updated: number }>('/notifications/in-app/read-all', {}),

    getCommittees: (params?: { mine?: boolean }) =>
      client.get<{ data: Committee[] }>('/committees', { params }),

    getCommittee: (id: string) => client.get<Committee>(`/committees/${id}`),

    createCommittee: (body: CreateCommitteeInput) =>
      client.post<Committee>('/committees', body),

    updateCommittee: (id: string, body: UpdateCommitteeInput) =>
      client.patch<Committee>(`/committees/${id}`, body),

    getCommitteeDashboard: (params?: { committeeId?: string }) =>
      client.get<CommitteeDashboard>('/committees/dashboard', { params }),

    getCommitteeDashboardFor: (committeeId: string) =>
      client.get<CommitteeDashboard>(`/committees/${committeeId}/dashboard`),

    getCommitteeMembers: (committeeId: string) =>
      client.get<{ data: CommitteeMember[] }>(`/committees/${committeeId}/members`),

    addCommitteeMember: (committeeId: string, body: CreateCommitteeMemberInput) =>
      client.post<CommitteeMember>(`/committees/${committeeId}/members`, body),

    updateCommitteeMember: (
      committeeId: string,
      memberId: string,
      body: UpdateCommitteeMemberInput,
    ) => client.patch<CommitteeMember>(`/committees/${committeeId}/members/${memberId}`, body),

    removeCommitteeMember: (committeeId: string, memberId: string) =>
      client.delete<{ deleted: boolean }>(`/committees/${committeeId}/members/${memberId}`),

    getCommitteeCalendarBlocks: (committeeId: string) =>
      client.get<{ data: CommitteeCalendarBlock[] }>(
        `/committees/${committeeId}/calendar-blocks`,
      ),

    createCommitteeCalendarBlock: (
      committeeId: string,
      body: CreateCommitteeCalendarBlockInput,
    ) =>
      client.post<CommitteeCalendarBlock>(
        `/committees/${committeeId}/calendar-blocks`,
        body,
      ),

    updateCommitteeCalendarBlock: (
      committeeId: string,
      blockId: string,
      body: UpdateCommitteeCalendarBlockInput,
    ) =>
      client.patch<CommitteeCalendarBlock>(
        `/committees/${committeeId}/calendar-blocks/${blockId}`,
        body,
      ),

    deleteCommitteeCalendarBlock: (committeeId: string, blockId: string) =>
      client.delete<{ deleted: boolean }>(
        `/committees/${committeeId}/calendar-blocks/${blockId}`,
      ),

    getCommitteeTasks: (committeeId: string) =>
      client.get<{ data: CommitteeTask[] }>(`/committees/${committeeId}/tasks`),

    createCommitteeTask: (committeeId: string, body: CreateCommitteeTaskInput) =>
      client.post<CommitteeTask>(`/committees/${committeeId}/tasks`, body),

    updateCommitteeTask: (
      committeeId: string,
      taskId: string,
      body: UpdateCommitteeTaskInput,
    ) => client.patch<CommitteeTask>(`/committees/${committeeId}/tasks/${taskId}`, body),

    getCommitteeTargets: (committeeId: string) =>
      client.get<{ data: CommitteeTarget[] }>(`/committees/${committeeId}/targets`),

    createCommitteeTarget: (committeeId: string, body: CreateCommitteeTargetInput) =>
      client.post<CommitteeTarget>(`/committees/${committeeId}/targets`, body),

    updateCommitteeTarget: (
      committeeId: string,
      targetId: string,
      body: UpdateCommitteeTargetInput,
    ) => client.patch<CommitteeTarget>(`/committees/${committeeId}/targets/${targetId}`, body),

    getCommitteeRequests: (committeeId: string) =>
      client.get<{ data: CommitteeRequest[] }>(`/committees/${committeeId}/requests`),

    createCommitteeRequest: (committeeId: string, body: CreateCommitteeRequestInput) =>
      client.post<CommitteeRequest>(`/committees/${committeeId}/requests`, body),

    updateCommitteeRequest: (
      committeeId: string,
      requestId: string,
      body: UpdateCommitteeRequestInput,
    ) =>
      client.patch<CommitteeRequest>(
        `/committees/${committeeId}/requests/${requestId}`,
        body,
      ),

    getCommitteeMessages: (committeeId: string) =>
      client.get<{ data: CommitteeMessage[] }>(`/committees/${committeeId}/messages`),

    createCommitteeMessage: (committeeId: string, body: CreateCommitteeMessageInput) =>
      client.post<CommitteeMessage>(`/committees/${committeeId}/messages`, body),

    getMyCommitteeTasks: (params?: { committeeId?: string }) =>
      client.get<{ data: CommitteeTask[] }>('/committees/my/tasks', { params }),

    getMyCommitteeBoardTasks: (params?: { committeeId?: string }) =>
      client.get<{ data: CommitteeTask[] }>('/committees/my/board-tasks', { params }),

    getMyCommitteeBlocks: (params?: { committeeId?: string }) =>
      client.get<{ data: CommitteeCalendarBlock[] }>('/committees/my/blocks', { params }),

    getMyCommitteeRequests: (params?: { committeeId?: string }) =>
      client.get<{ data: CommitteeRequest[] }>('/committees/my/requests', { params }),

    getMyPendingApprovals: (params?: { committeeId?: string }) =>
      client.get<{ data: CommitteeRequest[] }>('/committees/my/pending-approvals', { params }),

    getMyPendingLeave: (params?: { committeeId?: string }) =>
      client.get<{ data: CommitteeRequest[] }>('/committees/my/pending-leave', { params }),

    getCommitteeRoster: () => client.get<CommitteeRoster>('/committees/roster'),

    getAllCommitteeReports: () =>
      client.get<{ data: CommitteeReport[] }>('/committees/reports'),

    getCommitteeReports: (committeeId: string) =>
      client.get<{ data: CommitteeReport[] }>(`/committees/${committeeId}/reports`),

    createCommitteeReport: (committeeId: string, body: CreateCommitteeReportInput) =>
      client.post<CommitteeReport>(`/committees/${committeeId}/reports`, body),

    getCommitteeLeadershipHistory: (committeeId: string) =>
      client.get<{ data: CommitteeLeadershipRecord[] }>(
        `/committees/${committeeId}/leadership-history`,
      ),
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
