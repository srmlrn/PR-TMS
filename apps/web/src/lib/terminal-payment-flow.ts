import type { Currency, TerminalCheckoutStatus } from '@tms/types';
import type { Endpoints } from './api/endpoints';
import { waitForSessionPaid } from './payment-flow';

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 90;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollTerminalCheckout(
  ep: Endpoints,
  sessionId: string,
  onStatus?: (status: TerminalCheckoutStatus) => void,
): Promise<void> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const status = await ep.getTerminalCheckoutStatus(sessionId);
    onStatus?.(status);

    if (status.status === 'succeeded') {
      await waitForSessionPaid(ep, sessionId);
      return;
    }
    if (status.status === 'failed' || status.status === 'cancelled') {
      throw new Error(status.failureMessage ?? 'Terminal payment failed. Please try again.');
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Terminal payment timed out. Check the reader and try again.');
}

export async function runTerminalCheckout(
  ep: Endpoints,
  input: {
    amount: number;
    currency: Currency;
    purpose: string;
    devoteeId?: string;
    readerId?: string;
  },
  onStatus?: (status: TerminalCheckoutStatus) => void,
): Promise<string> {
  const session = await ep.createTerminalCheckoutSession(input);
  onStatus?.({
    sessionId: session.id,
    status: 'pending',
    amount: session.amount,
    currency: session.currency,
    readerId: input.readerId,
  });

  const processing = await ep.processTerminalCheckout(session.id, input.readerId);
  onStatus?.(processing);

  await pollTerminalCheckout(ep, session.id, onStatus);
  return session.id;
}
