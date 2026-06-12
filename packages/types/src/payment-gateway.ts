import { Currency } from './enums';

/** PSP integrations the platform can plug in per tenant. */
export type PaymentGatewayId =
  | 'stripe'
  | 'razorpay'
  | 'paypal'
  | 'square'
  | 'authorize_net'
  | 'paytm';

export type PaymentChannel = 'online' | 'counter' | 'kiosk' | 'mobile';

export interface PaymentGatewayCapabilities {
  /** Card / wallet checkout in browser (Payment Element, PayPal buttons, etc.). */
  onlineCheckout: boolean;
  /** Card-present hardware (Stripe Terminal, Square Reader, Razorpay POS). */
  counterCardPresent: boolean;
  /** Staff types card in browser at counter. */
  counterManualEntry: boolean;
  /** Static or dynamic QR (UPI, PayPal, etc.). */
  qrPay: boolean;
  /** Typical wallet brands when supported. */
  wallets: ('apple_pay' | 'google_pay' | 'venmo' | 'paypal')[];
  /** ISO country codes where the gateway operates for live payments. */
  countries: string[];
  currencies: Currency[];
}

export interface PaymentGatewayCatalogEntry {
  id: PaymentGatewayId;
  label: string;
  capabilities: PaymentGatewayCapabilities;
  /** How tenant credentials are stored today or planned. */
  configModel: 'tenant_settings_row' | 'env_fallback' | 'planned';
  notes?: string;
}

/**
 * Reference catalog — drives Admin UI and future Payment Hub routing.
 * Live code today implements stripe + razorpay + paypal + qr + cash + demo.
 */
export const PAYMENT_GATEWAY_CATALOG: PaymentGatewayCatalogEntry[] = [
  {
    id: 'stripe',
    label: 'Stripe',
    configModel: 'tenant_settings_row',
    capabilities: {
      onlineCheckout: true,
      counterCardPresent: true,
      counterManualEntry: true,
      qrPay: false,
      wallets: ['apple_pay', 'google_pay'],
      countries: ['US', 'CA', 'GB', 'AU', 'SG'],
      currencies: [Currency.USD, Currency.CAD, Currency.GBP],
    },
    notes: 'Per-temple keys in Admin → Payments. Terminal uses same Stripe account.',
  },
  {
    id: 'razorpay',
    label: 'Razorpay',
    configModel: 'env_fallback',
    capabilities: {
      onlineCheckout: true,
      counterCardPresent: false,
      counterManualEntry: false,
      qrPay: true,
      wallets: [],
      countries: ['IN'],
      currencies: [Currency.INR],
    },
    notes: 'INR UPI QR + checkout. Razorpay POS (card-present) is a separate future integration.',
  },
  {
    id: 'paypal',
    label: 'PayPal (+ Venmo US)',
    configModel: 'tenant_settings_row',
    capabilities: {
      onlineCheckout: true,
      counterCardPresent: false,
      counterManualEntry: false,
      qrPay: false,
      wallets: ['paypal', 'venmo'],
      countries: ['US', 'CA', 'GB', 'AU'],
      currencies: [Currency.USD, Currency.CAD, Currency.GBP],
    },
    notes: 'PayPal Checkout Orders API; Venmo via enable-funding on same integration.',
  },
  {
    id: 'square',
    label: 'Square',
    configModel: 'planned',
    capabilities: {
      onlineCheckout: true,
      counterCardPresent: true,
      counterManualEntry: true,
      qrPay: false,
      wallets: ['apple_pay', 'google_pay'],
      countries: ['US', 'CA', 'GB', 'AU'],
      currencies: [Currency.USD, Currency.CAD, Currency.GBP],
    },
    notes: 'Square Terminal + Web Payments SDK — alternative to Stripe for US temples.',
  },
  {
    id: 'authorize_net',
    label: 'Authorize.net',
    configModel: 'planned',
    capabilities: {
      onlineCheckout: true,
      counterCardPresent: false,
      counterManualEntry: true,
      qrPay: false,
      wallets: [],
      countries: ['US', 'CA'],
      currencies: [Currency.USD, Currency.CAD],
    },
  },
  {
    id: 'paytm',
    label: 'Paytm',
    configModel: 'planned',
    capabilities: {
      onlineCheckout: true,
      counterCardPresent: false,
      counterManualEntry: false,
      qrPay: true,
      wallets: [],
      countries: ['IN'],
      currencies: [Currency.INR],
    },
  },
];

/** Gateways a tenant has enabled (future: loaded from DB). */
export interface TenantEnabledGateways {
  tenantId: string;
  gateways: PaymentGatewayId[];
  defaultOnlineGateway: PaymentGatewayId;
  defaultCounterGateway: PaymentGatewayId;
}
