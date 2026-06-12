import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  InAppNotification,
  InAppNotificationType,
  NotificationTemplate,
  SendNotificationInput,
  SendNotificationResult,
} from '@tms/types';
import { v4 as uuidv4 } from 'uuid';

const TEMPLATES: NotificationTemplate[] = [
  {
    id: 'reminder-star-day',
    channel: 'sms',
    name: 'Star day reminder',
    body: 'Namaste {{name}}! Today is your {{label}}. We look forward to seeing you at the temple.',
  },
  {
    id: 'reminder-birthday',
    channel: 'sms',
    name: 'Birthday reminder',
    body: 'Happy birthday {{name}}! May the divine bless you on this special day.',
  },
  {
    id: 'reminder-anniversary',
    channel: 'email',
    name: 'Anniversary reminder',
    subject: 'Temple anniversary wishes — {{label}}',
    body: 'Dear {{name}},\n\nWishing you blessings on your {{label}}.\n\nOm Namo Venkatesaya.',
  },
  {
    id: 'booking-confirmed',
    channel: 'email',
    name: 'Booking confirmation',
    subject: 'Seva booking confirmed — {{service}}',
    body: 'Dear {{name}},\n\nYour seva booking for {{service}} on {{date}} is confirmed.\n\nReceipt: {{receipt}}',
  },
  {
    id: 'donation-receipt',
    channel: 'email',
    name: 'Donation receipt',
    subject: 'Thank you for your donation',
    body: 'Dear {{name}},\n\nWe received your donation of {{amount}}. Receipt: {{receipt}}',
  },
  {
    id: 'pos-invoice',
    channel: 'email',
    name: 'Counter POS invoice',
    subject: 'Your temple invoice — {{receipt}}',
    body:
      'Dear {{name}},\n\nThank you for your visit. Invoice {{receipt}} dated {{date}} totals {{amount}} across {{lines}} line(s).\n\nYou can view and print your invoice from the temple portal.\n\nWith blessings.',
  },
  {
    id: 'queue-token',
    channel: 'sms',
    name: 'Queue token',
    body: 'Your darshan token is {{tokenNumber}}. Est. wait ~{{wait}} min.',
  },
  {
    id: 'volunteer-signup-confirmed',
    channel: 'email',
    name: 'Volunteer shift confirmation',
    subject: 'Seva confirmed — {{shift}}',
    body: 'Namaste {{name}},\n\nYou are confirmed for {{shift}} on {{date}} at {{time}}.\n\nLocation: {{location}}\nCoordinator: {{coordinator}}',
  },
  {
    id: 'volunteer-waitlisted',
    channel: 'email',
    name: 'Volunteer waitlist',
    subject: 'Waitlisted — {{shift}}',
    body: 'Namaste {{name}},\n\n{{shift}} on {{date}} is full. You are #{{position}} on the waitlist. We will notify you if a spot opens.',
  },
  {
    id: 'volunteer-shift-reminder',
    channel: 'sms',
    name: 'Volunteer shift reminder',
    body: 'Reminder: {{shift}} tomorrow {{date}} at {{time}}. Location: {{location}}. Reply if you cannot attend.',
  },
  {
    id: 'volunteer-checkin-reminder',
    channel: 'sms',
    name: 'Volunteer check-in reminder',
    body: 'Your seva shift {{shift}} starts in 1 hour. Please check in at {{location}} when you arrive.',
  },
  {
    id: 'volunteer-new-opportunity',
    channel: 'email',
    name: 'New volunteer opportunity',
    subject: 'Volunteers needed — {{event}}',
    body: 'Namaste {{name}},\n\n{{event}} needs volunteers. {{slotsRemaining}} slots open across {{shiftsOpen}} shifts.\n\nSign up in the temple app under Volunteering.',
  },
];

type InAppRecord = InAppNotification & { tenantId: string };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly inAppStore = new Map<string, InAppRecord>();

  getTemplates(): NotificationTemplate[] {
    return TEMPLATES;
  }

  getTemplate(id: string): NotificationTemplate {
    const template = TEMPLATES.find((t) => t.id === id);
    if (!template) {
      throw new NotFoundException(`Notification template ${id} not found`);
    }
    return template;
  }

  send(input: SendNotificationInput): SendNotificationResult {
    const template = input.templateId ? this.getTemplate(input.templateId) : undefined;
    const subject = input.subject ?? template?.subject;
    const body = input.body ?? template?.body ?? '';
    const renderedBody = this.renderTemplate(body, input.metadata);
    const renderedSubject = subject ? this.renderTemplate(subject, input.metadata) : undefined;

    const result: SendNotificationResult = {
      id: uuidv4(),
      channel: input.channel,
      to: input.to,
      status: 'queued',
      templateId: input.templateId,
      queuedAt: new Date().toISOString(),
    };

    if (input.channel === 'email') {
      this.logger.log(
        `[email-stub] queued to=${input.to} subject="${renderedSubject ?? '(no subject)'}" ` +
          `body="${renderedBody.slice(0, 120)}${renderedBody.length > 120 ? '…' : ''}"`,
      );
    } else {
      this.logger.log(
        `[sms-stub] queued to=${input.to} body="${renderedBody.slice(0, 160)}${renderedBody.length > 160 ? '…' : ''}"`,
      );
    }

    return result;
  }

  createInApp(
    tenantId: string,
    userId: string,
    type: InAppNotificationType,
    title: string,
    body: string,
    metadata?: Record<string, string>,
  ): InAppNotification {
    const record: InAppRecord = {
      id: uuidv4(),
      tenantId,
      userId,
      type,
      title,
      body,
      read: false,
      createdAt: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    };
    this.inAppStore.set(record.id, record);
    this.logger.log(`[in-app] user=${userId} type=${type} title="${title}"`);
    return this.toInApp(record);
  }

  listInAppForUser(tenantId: string, userId: string): InAppNotification[] {
    return [...this.inAppStore.values()]
      .filter((n) => n.tenantId === tenantId && n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((n) => this.toInApp(n));
  }

  markInAppRead(tenantId: string, userId: string, id: string): InAppNotification {
    const record = this.inAppStore.get(id);
    if (!record || record.tenantId !== tenantId || record.userId !== userId) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    record.read = true;
    this.inAppStore.set(id, record);
    return this.toInApp(record);
  }

  markAllInAppRead(tenantId: string, userId: string): { updated: number } {
    let updated = 0;
    for (const [id, record] of this.inAppStore) {
      if (record.tenantId === tenantId && record.userId === userId && !record.read) {
        record.read = true;
        this.inAppStore.set(id, record);
        updated += 1;
      }
    }
    return { updated };
  }

  private toInApp(record: InAppRecord): InAppNotification {
    const { tenantId: _t, ...notification } = record;
    return notification;
  }

  private renderTemplate(
    text: string,
    metadata?: Record<string, string>,
  ): string {
    if (!metadata) {
      return text;
    }
    return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => metadata[key] ?? `{{${key}}}`);
  }
}
