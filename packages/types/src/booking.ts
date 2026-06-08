import { BookingStatus, Currency, PaymentStatus } from './enums';
import { Sankalpa, TenantScoped, Timestamps } from './common';

export interface SevaService extends TenantScoped, Timestamps {
  id: string;
  name: string;
  deity: string;
  description?: string;
  /** On-site (temple) price. */
  price: number;
  /** Off-site (home / outside) price — omit when service is on-site only. */
  priceOffSite?: number;
  currency: Currency;
  durationMinutes: number;
  isActive: boolean;
}

export type SevaServiceLocation = 'on_site' | 'off_site';

/** Unit price for a seva line from catalog + ritual location. */
export function resolveSevaUnitPrice(
  service: Pick<SevaService, 'price' | 'priceOffSite'>,
  location: SevaServiceLocation,
): number {
  if (location === 'off_site' && service.priceOffSite != null) {
    return service.priceOffSite;
  }
  return service.price;
}

export function sevaSupportsOffSite(service: Pick<SevaService, 'priceOffSite'>): boolean {
  return service.priceOffSite != null;
}

export interface Booking extends TenantScoped, Timestamps {
  id: string;
  devoteeId: string;
  serviceId: string;
  priestId?: string;
  scheduledAt: Date;
  status: BookingStatus;
  amount: number;
  currency: Currency;
  sankalpa?: Sankalpa;
  receiptNumber?: string;
  channel: 'app' | 'counter' | 'online' | 'kiosk';
  paymentStatus?: PaymentStatus;
  honorariumAmount?: number;
}

export interface CreateBookingInput {
  devoteeId: string;
  serviceId: string;
  scheduledAt: string;
  sankalpa?: Sankalpa;
  /** Free-text priest preference — persisted on sankalpa. */
  priestPreference?: string;
  channel?: Booking['channel'];
  paymentSessionId?: string;
  /** Line quantity — amount = catalog price × quantity (default 1). */
  quantity?: number;
  /** Counter POS ritual location. */
  location?: 'on_site' | 'off_site';
  /** Participating remotely — merged into sankalpa. */
  remoteParticipation?: boolean;
  /** Comma-separated additional beneficiary names — merged into sankalpa. */
  additionalBeneficiaries?: string;
}
