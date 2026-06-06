import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DevoteeReminderDue } from '@tms/types';
import { DevoteeService } from './devotee.service';

@Injectable()
export class DevoteeReminderService implements OnModuleInit {
  private readonly logger = new Logger(DevoteeReminderService.name);

  constructor(private readonly devoteeService: DevoteeService) {}

  onModuleInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.logger.log(`Important-dates reminder job stub registered (daily check on ${today})`);
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

  private monthDayKey(isoDate: string): string {
    const normalized = isoDate.slice(0, 10);
    const [, month, day] = normalized.split('-');
    return `${month}-${day}`;
  }
}
