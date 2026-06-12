/** Stripe Terminal reader exposed to admin / counter UI. */
export interface TerminalReader {
  id: string;
  label: string;
  deviceType: string;
  status: string;
  serialNumber?: string;
  ipAddress?: string;
  locationId?: string;
}

export type TerminalSessionStatus =
  | 'pending'
  | 'awaiting_card'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

/** Live status returned when polling a counter terminal checkout. */
export interface TerminalCheckoutStatus {
  sessionId: string;
  status: TerminalSessionStatus;
  readerId?: string;
  readerLabel?: string;
  failureMessage?: string;
  amount: number;
  currency: string;
}

export interface CreateTerminalCheckoutInput {
  amount: number;
  currency: import('./enums').Currency;
  purpose: string;
  devoteeId?: string;
}

export interface ProcessTerminalCheckoutInput {
  readerId?: string;
}

/** Counter staff visibility — no secrets. */
export interface TerminalCounterConfig {
  enabled: boolean;
  hasDefaultReader: boolean;
}
