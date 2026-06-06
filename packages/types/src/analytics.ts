import { Currency } from './enums';
import { QueueStats } from './frontdesk';

export interface DonationsMtdSummary {
  count: number;
  total: number;
  currency: Currency;
}

export interface DashboardAnalytics {
  devotees: number;
  bookingsToday: number;
  donationsMtd: DonationsMtdSummary;
  queue: QueueStats;
}
