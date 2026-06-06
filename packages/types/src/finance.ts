import { Currency } from './enums';
import { TenantScoped, Timestamps } from './common';

export interface FinanceSummary {
  incomeMtd: number;
  expensesMtd: number;
  receivables: number;
  payables: number;
  currency: Currency;
}

export interface VendorPayment extends TenantScoped, Timestamps {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  currency: Currency;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
}

export interface TaxComplianceStatus {
  jurisdiction: 'usa' | 'india' | 'canada';
  label: string;
  readyCount: number;
  pendingCount: number;
}
