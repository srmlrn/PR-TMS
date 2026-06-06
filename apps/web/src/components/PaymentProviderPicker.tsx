'use client';

import type { Currency, PaymentProvider } from '@tms/types';
import {
  PAYMENT_PROVIDER_LABELS,
  availablePaymentProviders,
} from '@/lib/payment-flow';

export function PaymentProviderPicker({
  value,
  onChange,
  channel,
}: {
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
  currency: Currency;
  channel?: string;
}) {
  const providers = availablePaymentProviders(channel);

  return (
    <div className="formGroup">
      <label htmlFor="paymentProvider">Payment method</label>
      <select
        id="paymentProvider"
        value={value}
        onChange={(e) => onChange(e.target.value as PaymentProvider)}
      >
        {providers.map((p) => (
          <option key={p} value={p}>
            {PAYMENT_PROVIDER_LABELS[p]}
          </option>
        ))}
      </select>
    </div>
  );
}
