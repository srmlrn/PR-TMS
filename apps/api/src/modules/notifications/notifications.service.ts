import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
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
    id: 'queue-token',
    channel: 'sms',
    name: 'Queue token',
    body: 'Your darshan token is {{tokenNumber}}. Est. wait ~{{wait}} min.',
  },
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

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
