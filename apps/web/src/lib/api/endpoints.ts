import type {
  Booking,
  Devotee,
  EventLifecycleStage,
  FinanceSummary,
  PaginatedResponse,
  PrasadamSponsorship,
  RentalAsset,
  RentalOrder,
  Sponsor,
  TempleEvent,
} from '@tms/types';
import type { ApiClient } from './client';

export type EventPipeline = Record<EventLifecycleStage, TempleEvent[]>;

export interface ListParams extends Record<string, string | number | boolean | undefined> {
  page?: number;
  limit?: number;
  devoteeId?: string;
  date?: string;
}

export function createEndpoints(client: ApiClient) {
  return {
    getFinanceSummary: () => client.get<FinanceSummary>('/finance/summary'),

    getBookings: (params?: ListParams) =>
      client.get<PaginatedResponse<Booking>>('/bookings', { params }),

    getDevotees: (params?: Pick<ListParams, 'page' | 'limit'>) =>
      client.get<PaginatedResponse<Devotee>>('/devotees', { params }),

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
