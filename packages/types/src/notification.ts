export type NotificationChannel = 'email' | 'sms';

export type InAppNotificationType =
  | 'volunteer_signup_confirmed'
  | 'volunteer_waitlisted'
  | 'volunteer_waitlist_promoted'
  | 'volunteer_shift_reminder'
  | 'volunteer_checkin_reminder'
  | 'volunteer_new_opportunity'
  | 'general';

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

export interface InAppNotification {
  id: string;
  userId: string;
  type: InAppNotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, string>;
}
