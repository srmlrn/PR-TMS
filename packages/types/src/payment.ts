import { Currency, PaymentStatus } from './enums';
import { TenantScoped, Timestamps } from './common';

export type PaymentProvider = 'stripe' | 'razorpay' | 'demo' | 'cash';

export interface PaymentSession extends TenantScoped, Timestamps {
  id: string;
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  status: PaymentStatus;
  purpose: string;
  devoteeId?: string;
  metadata?: Record<string, string>;
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
