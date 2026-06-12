import { Currency, PaymentStatus } from './enums';
import { TenantScoped, Timestamps } from './common';

export type PaymentProvider = 'stripe' | 'razorpay' | 'paypal' | 'qr' | 'demo' | 'cash';
export type PaymentMode = 'live' | 'demo';

export interface PaymentSession extends TenantScoped, Timestamps {
  id: string;
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  status: PaymentStatus;
  purpose: string;
  devoteeId?: string;
  metadata?: Record<string, string>;
  /** Stripe PaymentIntent id or Razorpay order id when live mode is active. */
  providerRefId?: string;
  /** Stripe client secret for Elements / Payment Element (live mode only). */
  clientSecret?: string;
  /** Tenant Stripe publishable key for client checkout (live mode only). */
  stripePublishableKey?: string;
  /** PayPal client id for JS SDK buttons (live mode only). */
  paypalClientId?: string;
  /** UPI string or pay URL encoded in the QR (qr provider). */
  qrPayload?: string;
  /** Razorpay-hosted QR image URL when live UPI QR is used. */
  qrImageUrl?: string;
  paymentMode?: PaymentMode;
  /** ISO timestamp when an unpaid session expires (typically 30 minutes after creation). */
  expiresAt?: string;
  /** Stripe Terminal counter checkout status (card-present hardware). */
  terminalStatus?: import('./payment-terminal').TerminalSessionStatus;
  terminalReaderId?: string;
  terminalFailureMessage?: string;
}

export interface CreatePaymentSessionInput {
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  purpose: string;
  devoteeId?: string;
  metadata?: Record<string, string>;
}

export interface FxRates {
  base: Currency;
  rates: Record<Currency, number>;
  asOf: string;
}

export interface CurrencyPaymentProviders {
  currency: Currency;
  providers: PaymentProvider[];
  defaultProvider: PaymentProvider;
}

export type PaymentProvidersResponse = CurrencyPaymentProviders[];

export interface TaxReceipt {
  receiptNumber: string;
  amount: number;
  currency: Currency;
  taxDocType?: 'irs_501c3' | '80g' | 'cra';
  taxId?: string;
  devoteeId: string;
  purpose: string;
  issuedAt: string;
  templeName: string;
}

export interface DevoteeTaxStatementLine {
  date: string;
  receiptNumber: string;
  purpose: string;
  amount: number;
  currency: Currency;
}

export interface DevoteeTaxStatement {
  statementNumber: string;
  devoteeId: string;
  devoteeName: string;
  taxId?: string;
  year: number;
  totalAmount: number;
  currency: Currency;
  taxDocType: 'irs_501c3' | '80g' | 'cra';
  templeName: string;
  templeAddress?: string;
  issuedAt: string;
  donations: DevoteeTaxStatementLine[];
}
