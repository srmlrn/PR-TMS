import { BookingStatus, Currency, PaymentStatus } from './enums';
import { Sankalpa, TenantScoped, Timestamps } from './common';

export interface SevaService extends TenantScoped, Timestamps {
  id: string;
  name: string;
  deity: string;
  description?: string;
  price: number;
  currency: Currency;
  durationMinutes: number;
  isActive: boolean;
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
}
