import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Currency, PaymentKeyMode, ResolvedPayPalConfig } from '@tms/types';
import { TenantPaymentSettingsService } from '../settings/tenant-payment-settings.service';
import { toPayPalAmount } from './payment-config';

export interface PayPalOrderResult {
  orderId: string;
}

interface PayPalAccessToken {
  access_token: string;
}

function paypalApiBase(mode: PaymentKeyMode): string {
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

@Injectable()
export class PayPalProvider {
  private readonly logger = new Logger(PayPalProvider.name);
  private readonly tokenCache = new Map<
    string,
    { token: string; expiresAt: number }
  >();

  constructor(private readonly paymentSettings: TenantPaymentSettingsService) {}

  private cacheKey(tenantId: string, config: ResolvedPayPalConfig): string {
    return `${tenantId}:${config.clientId}:${config.clientSecret}`;
  }

  private async getAccessToken(
    tenantId: string,
  ): Promise<{ token: string; config: ResolvedPayPalConfig } | null> {
    const config = await this.paymentSettings.resolvePayPalConfigForTenant(tenantId);
    if (
      !this.paymentSettings.isPayPalLiveForTenant(config) ||
      !config.clientId ||
      !config.clientSecret
    ) {
      return null;
    }

    const key = this.cacheKey(tenantId, config);
    const cached = this.tokenCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { token: cached.token, config };
    }

    const base = paypalApiBase(config.mode);
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`PayPal OAuth failed (${res.status}): ${body}`);
      return null;
    }

    const data = (await res.json()) as PayPalAccessToken & { expires_in?: number };
    const ttlMs = Math.max(60, (data.expires_in ?? 300) - 30) * 1000;
    this.tokenCache.set(key, {
      token: data.access_token,
      expiresAt: Date.now() + ttlMs,
    });

    return { token: data.access_token, config };
  }

  async createOrder(opts: {
    amount: number;
    currency: Currency;
    purpose: string;
    sessionId: string;
    tenantId: string;
    devoteeId?: string;
  }): Promise<PayPalOrderResult | null> {
    const auth = await this.getAccessToken(opts.tenantId);
    if (!auth) {
      return null;
    }

    const base = paypalApiBase(auth.config.mode);
    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: opts.currency,
              value: toPayPalAmount(opts.amount),
            },
            description: opts.purpose.slice(0, 127),
            custom_id: `${opts.tenantId}|${opts.sessionId}`,
            invoice_id: opts.sessionId.slice(0, 127),
          },
        ],
        application_context: {
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`PayPal create order failed (${res.status}): ${body}`);
      return null;
    }

    const order = (await res.json()) as { id?: string };
    if (!order.id) {
      return null;
    }

    this.logger.log(`Created PayPal order ${order.id} for session ${opts.sessionId}`);
    return { orderId: order.id };
  }

  async captureOrder(
    tenantId: string,
    orderId: string,
  ): Promise<'COMPLETED' | string | null> {
    const auth = await this.getAccessToken(tenantId);
    if (!auth) {
      return null;
    }

    const base = paypalApiBase(auth.config.mode);
    const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`PayPal capture failed (${res.status}) for ${orderId}: ${body}`);
      return null;
    }

    const data = (await res.json()) as { status?: string };
    this.logger.log(`Captured PayPal order ${orderId} → ${data.status ?? 'unknown'}`);
    return data.status ?? null;
  }

  async fetchOrderStatus(tenantId: string, orderId: string): Promise<string | null> {
    const auth = await this.getAccessToken(tenantId);
    if (!auth) {
      return null;
    }

    const base = paypalApiBase(auth.config.mode);
    const res = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { status?: string };
    return data.status ?? null;
  }

  async verifyWebhookSignature(opts: {
    tenantId: string;
    headers: Record<string, string | undefined>;
    body: unknown;
  }): Promise<boolean> {
    const config = await this.paymentSettings.resolvePayPalConfigForTenant(opts.tenantId);
    const webhookId = config.webhookId?.trim();
    if (!webhookId) {
      throw new UnauthorizedException('PayPal webhook id is not configured for this tenant');
    }

    const auth = await this.getAccessToken(opts.tenantId);
    if (!auth) {
      throw new UnauthorizedException('PayPal is not configured for this tenant');
    }

    const base = paypalApiBase(auth.config.mode);
    const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: opts.headers['paypal-auth-algo'],
        cert_url: opts.headers['paypal-cert-url'],
        transmission_id: opts.headers['paypal-transmission-id'],
        transmission_sig: opts.headers['paypal-transmission-sig'],
        transmission_time: opts.headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: opts.body,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`PayPal webhook verify failed (${res.status}): ${text}`);
      throw new UnauthorizedException('Invalid PayPal webhook signature');
    }

    const data = (await res.json()) as { verification_status?: string };
    if (data.verification_status !== 'SUCCESS') {
      this.logger.warn(`PayPal webhook verification_status=${data.verification_status}`);
      throw new UnauthorizedException('Invalid PayPal webhook signature');
    }

    return true;
  }
}
