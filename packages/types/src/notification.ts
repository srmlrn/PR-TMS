export type NotificationChannel = 'email' | 'sms';

export interface NotificationTemplate {
  id: string;
  channel: NotificationChannel;
  name: string;
  subject?: string;
  body: string;
}

export interface SendNotificationInput {
  channel: NotificationChannel;
  to: string;
  templateId?: string;
  subject?: string;
  body?: string;
  metadata?: Record<string, string>;
}

export interface SendNotificationResult {
  id: string;
  channel: NotificationChannel;
  to: string;
  status: 'queued';
  templateId?: string;
  queuedAt: string;
}
