import { Injectable } from '@nestjs/common';
import { Currency, DashboardAnalytics } from '@tms/types';
import { BookingService } from '../booking/booking.service';
import { DevoteeService } from '../devotee/devotee.service';
import { DonationService } from '../donation/donation.service';
import { FrontDeskService } from '../frontdesk/frontdesk.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly devoteeService: DevoteeService,
    private readonly bookingService: BookingService,
    private readonly donationService: DonationService,
    private readonly frontDeskService: FrontDeskService,
  ) {}

  async getDashboard(tenantId: string): Promise<DashboardAnalytics> {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [devotees, bookingsToday, donationsPage, queue] = await Promise.all([
      this.devoteeService.findAll(tenantId, 1, 1),
      this.bookingService.findAll(tenantId, 1, 1, { date: today }),
      this.donationService.findDonations(tenantId, 1, 500),
      this.frontDeskService.getQueueStats(tenantId),
    ]);

    const mtdDonations = donationsPage.data.filter(
      (d) => new Date(d.createdAt) >= monthStart,
    );
    const donationsTotal = mtdDonations.reduce((sum, d) => sum + d.amount, 0);
    const currency = mtdDonations[0]?.currency ?? Currency.USD;

    return {
      devotees: devotees.meta.total,
      bookingsToday: bookingsToday.meta.total,
      donationsMtd: {
        count: mtdDonations.length,
        total: donationsTotal,
        currency,
      },
      queue,
    };
  }
}
