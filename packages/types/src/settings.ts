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
