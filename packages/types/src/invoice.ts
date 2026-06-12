import type { Currency } from './enums';

export type CheckoutReceiptLineKind = 'booking' | 'donation';

export interface CheckoutReceiptLine {
  kind: CheckoutReceiptLineKind;
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  /** Seva service id when kind is booking */
  serviceId?: string;
  scheduledAt?: string;
  paymentStatus?: string;
  checkedIn?: boolean;
}

export interface CheckoutReceipt {
  id: string;
  receiptNumber: string;
  devoteeId: string;
  devoteeName?: string;
  devoteeEmail?: string;
  paymentSessionId?: string;
  grandTotal: number;
  currency: Currency;
  channel: string;
  paymentMethod?: string;
  notes?: string;
  issuedAt: string;
  lines: CheckoutReceiptLine[];
}

/** Invoice row on devotee profile history tab */
export interface DevoteeProfileInvoice {
  id: string;
  receiptNumber: string;
  issuedAt: string;
  grandTotal: number;
  currency: Currency;
  channel: string;
  lineCount: number;
  lines: CheckoutReceiptLine[];
  paymentStatus?: string;
}

export interface ShareCheckoutReceiptInput {
  email?: string;
  channel?: 'email';
}

export interface ShareCheckoutReceiptResult {
  queued: boolean;
  channel: 'email';
  recipient: string;
  message: string;
}
