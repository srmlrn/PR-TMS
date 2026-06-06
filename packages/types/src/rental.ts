import { Currency, RentalStatus } from './enums';
import { TenantScoped, Timestamps } from './common';

export interface RentalAsset extends TenantScoped, Timestamps {
  id: string;
  name: string;
  category: 'av' | 'furniture' | 'kitchen' | 'decor' | 'tent';
  quantity: number;
  availableQuantity: number;
  ratePerDay: number;
  currency: Currency;
  conditionGrade: 'A' | 'B' | 'C';
  status: 'available' | 'out' | 'under_repair';
}

export interface RentalOrder extends TenantScoped, Timestamps {
  id: string;
  clientName: string;
  eventId?: string;
  assetIds: { assetId: string; quantity: number }[];
  startDate: Date;
  endDate: Date;
  depositAmount: number;
  balanceAmount: number;
  currency: Currency;
  status: RentalStatus;
}

export interface ReturnInspection extends TenantScoped {
  id: string;
  rentalOrderId: string;
  returnedQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  damageCharge: number;
  refundAmount: number;
}
