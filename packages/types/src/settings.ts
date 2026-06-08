export type PaymentKeyMode = 'test' | 'live';

/** Placeholder shown in admin UI when a secret is already stored. */
export const SECRET_FIELD_MASK = '••••••••';

export interface TenantStripeSettingsPublic {
  enabled: boolean;
  mode: PaymentKeyMode;
  publishableKey?: string;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
}

export type PaymentSettingsSource = 'tenant' | 'env' | 'none';

export interface TenantPaymentSettingsPublic {
  tenantId: string;
  stripe: TenantStripeSettingsPublic;
  /** Whether keys come from tenant settings, platform env fallback, or are unset. */
  source: PaymentSettingsSource;
  updatedAt?: string;
}

export interface UpdateTenantStripeSettingsInput {
  enabled?: boolean;
  mode?: PaymentKeyMode;
  publishableKey?: string;
  /** Send a new value to replace; omit or send empty to keep existing. */
  secretKey?: string;
  webhookSecret?: string;
}

export interface UpdateTenantPaymentSettingsInput {
  stripe?: UpdateTenantStripeSettingsInput;
}

/** Internal shape persisted per tenant (includes secrets). */
export interface TenantPaymentSettingsRecord {
  tenantId: string;
  stripeEnabled: boolean;
  stripeMode: PaymentKeyMode;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  updatedAt: Date;
}

export interface ResolvedStripeConfig {
  enabled: boolean;
  mode: PaymentKeyMode;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  source: PaymentSettingsSource;
}

/** Per-tenant cosmetic overrides merged onto platform defaults. */
export interface TenantBrandingOverrides {
  name?: string;
  subtitle?: string;
  icon?: string;
  logoSrc?: string;
  logoBg?: string;
  deity?: string;
  location?: string;
  address?: string;
  displayAnnouncements?: string[];
}

export interface TenantBrandingSettingsPublic {
  tenantId: string;
  overrides: TenantBrandingOverrides;
  /** Fully merged branding for preview (defaults + overrides). */
  branding: import('./tenants').TenantBranding;
  updatedAt?: string;
}

export interface UpdateTenantBrandingInput {
  name?: string;
  subtitle?: string;
  icon?: string;
  logoSrc?: string;
  logoBg?: string;
  deity?: string;
  location?: string;
  address?: string;
  /** One announcement per line in admin UI; empty array clears ticker. */
  displayAnnouncements?: string[];
}

export interface TenantScheduleSettings {
  tenantId: string;
  /** Hour (0–23) when booking slots begin. */
  openHour: number;
  /** Hour (0–23) when booking slots end. */
  closeHour: number;
  /** Minutes between slot start times. */
  slotIntervalMinutes: number;
  updatedAt?: string;
}

export interface UpdateTenantScheduleInput {
  openHour?: number;
  closeHour?: number;
  slotIntervalMinutes?: number;
}

export interface CreateSevaServiceInput {
  name: string;
  deity: string;
  description?: string;
  price: number;
  priceOffSite?: number;
  currency?: import('./enums').Currency;
  durationMinutes?: number;
  isActive?: boolean;
}

export interface UpdateSevaServiceInput {
  name?: string;
  deity?: string;
  description?: string;
  price?: number;
  priceOffSite?: number | null;
  currency?: import('./enums').Currency;
  durationMinutes?: number;
  isActive?: boolean;
}

export interface CreatePosProductInput {
  name: string;
  price: number;
  currency?: import('./enums').Currency;
  isActive?: boolean;
}

export interface UpdatePosProductInput {
  name?: string;
  price?: number;
  currency?: import('./enums').Currency;
  isActive?: boolean;
}
