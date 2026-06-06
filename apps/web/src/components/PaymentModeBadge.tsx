'use client';

import { Badge } from '@tms/ui';
import type { PaymentMode } from '@tms/types';

function resolvePaymentMode(): PaymentMode {
  const mode = process.env.NEXT_PUBLIC_PAYMENT_MODE?.toLowerCase();
  return mode === 'live' ? 'live' : 'demo';
}

export function PaymentModeBadge() {
  const mode = resolvePaymentMode();
  const isLive = mode === 'live';

  return (
    <Badge variant={isLive ? 'ok' : 'pending'}>
      {isLive ? 'Live mode' : 'Demo mode'}
    </Badge>
  );
}
