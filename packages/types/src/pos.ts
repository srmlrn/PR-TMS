import { Currency } from './enums';
import { Booking } from './booking';
import { Donation } from './donation';

export type ServiceLocation = 'on_site' | 'off_site';

export type CounterPaymentMethod = 'cash' | 'check' | 'card';

export const DONATION_FUND_OPTIONS = [
  'General Hundi',
  'Building Fund',
  'Annadanam',
  'Education',
  'Festival Sponsorship',
  'Other',
] as const;

export type DonationFundOption = (typeof DONATION_FUND_OPTIONS)[number];

export interface PosSalesItem {
  id: string;
  name: string;
  price: number;
  currency: Currency;
}

/** Static prasadam / counter article catalog when no sales API exists. */
export const POS_SALES_CATALOG: PosSalesItem[] = [
  { id: 'sale-laddu', name: 'Laddu (single)', price: 2, currency: Currency.USD },
  { id: 'sale-laddu-dozen', name: 'Laddu (dozen)', price: 20, currency: Currency.USD },
  { id: 'sale-vibhuti', name: 'Vibhuti packet', price: 5, currency: Currency.USD },
  { id: 'sale-kumkum', name: 'Kumkum packet', price: 3, currency: Currency.USD },
  { id: 'sale-coconut', name: 'Coconut', price: 3, currency: Currency.USD },
  { id: 'sale-flower-garland', name: 'Flower garland', price: 15, currency: Currency.USD },
  { id: 'sale-prasadam-plate', name: 'Prasadam plate', price: 10, currency: Currency.USD },
  { id: 'sale-incense', name: 'Incense sticks', price: 5, currency: Currency.USD },
];

export interface PosServiceLineInput {
  serviceId: string;
  date: string;
  location: ServiceLocation;
  quantity: number;
  unitCost?: number;
  /** Shrine deity for this line — defaults from catalog but may be overridden at counter. */
  deity?: string;
}

export interface PosDonationLineInput {
  purpose: string;
  amount: number;
}

export interface PosSalesLineInput {
  itemId: string;
  quantity: number;
}

export interface PosCheckoutInput {
  devoteeId: string;
  currency: Currency;
  services?: PosServiceLineInput[];
  donations?: PosDonationLineInput[];
  sales?: PosSalesLineInput[];
  comment?: string;
  paymentSessionId: string;
  totalPaid: number;
  checkNumber?: string;
  paymentMethod?: CounterPaymentMethod;
  sankalpa?: {
    gotram?: string;
    nakshatra?: string;
    occasion?: string;
  };
}

export interface PosCheckoutResult {
  receiptNumber: string;
  bookings: Booking[];
  donations: Donation[];
  grandTotal: number;
  currency: Currency;
}
