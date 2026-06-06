import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DevoteeReminderDue } from '@tms/types';
import { NotificationsService } from '../notifications/notifications.service';
import { DevoteeService } from './devotee.service';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class DevoteeReminderService implements OnModuleInit {
  private readonly logger = new Logger(DevoteeReminderService.name);

  constructor(
    private readonly devoteeService: DevoteeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.logger.log(`Important-dates reminder job registered (daily check on ${today})`);
    void this.queueNotificationsForDate(DEMO_TENANT, today);
  }

  async findRemindersDue(tenantId: string, date: string): Promise<DevoteeReminderDue[]> {
    const target = this.monthDayKey(date);
    const { data: devotees } = await this.devoteeService.findAll(tenantId, 1, 500);
    const results: DevoteeReminderDue[] = [];

    for (const devotee of devotees) {
      for (const entry of devotee.importantDates ?? []) {
        if (this.monthDayKey(entry.date) === target) {
          results.push({
            devoteeId: devotee.id,
            devoteeName: `${devotee.firstName} ${devotee.lastName}`,
            phone: devotee.phone,
            importantDate: entry,
          });
        }
      }
    }

    return results;
  }

  async queueNotificationsForDate(
    tenantId: string,
    date: string,
  ): Promise<{ queued: number; reminders: DevoteeReminderDue[] }> {
    const reminders = await this.findRemindersDue(tenantId, date);
    let queued = 0;

    for (const reminder of reminders) {
      const templateId = this.templateForDateType(reminder.importantDate.type);
      const channel = templateId === 'reminder-anniversary' ? 'email' : 'sms';
      const to =
        channel === 'email'
          ? `${reminder.devoteeName.replace(/\s+/g, '.').toLowerCase()}@devotee.local`
          : reminder.phone;

      this.notificationsService.send({
        channel,
        to,
        templateId,
        metadata: {
          name: reminder.devoteeName,
          label: reminder.importantDate.label,
        },
      });
      queued += 1;
    }

    if (queued > 0) {
      this.logger.log(`Queued ${queued} reminder notification(s) for ${date.slice(0, 10)}`);
    }

    return { queued, reminders };
  }

  private templateForDateType(type: string): string {
    switch (type) {
      case 'birthday':
        return 'reminder-birthday';
      case 'anniversary':
        return 'reminder-anniversary';
      case 'star_day':
        return 'reminder-star-day';
      default:
        return 'reminder-star-day';
    }
  }

  private monthDayKey(isoDate: string): string {
    const normalized = isoDate.slice(0, 10);
    const [, month, day] = normalized.split('-');
    return `${month}-${day}`;
  }
}
