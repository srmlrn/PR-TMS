/** Build a UPI deep-link payload for QR display (INR). */
export function buildUpiQrPayload(opts: {
  vpa: string;
  payeeName: string;
  amount: number;
  purpose: string;
  transactionRef?: string;
}): string {
  const params = new URLSearchParams();
  params.set('pa', opts.vpa.trim());
  params.set('pn', opts.payeeName.trim().slice(0, 50));
  params.set('am', opts.amount.toFixed(2));
  params.set('cu', 'INR');
  params.set('tn', opts.purpose.trim().slice(0, 50));
  if (opts.transactionRef) {
    params.set('tr', opts.transactionRef.slice(0, 35));
  }
  return `upi://pay?${params.toString()}`;
}

/** Web URL encoded in QR — customer scans to pay on their phone (Apple Pay / Google Pay / card). */
export function buildWebPayQrPayload(
  webOrigin: string,
  sessionId: string,
  tenantId: string,
): string {
  const base = webOrigin.replace(/\/$/, '');
  const params = new URLSearchParams({
    sessionId,
    tenantId,
  });
  return `${base}/pay?${params.toString()}`;
}
