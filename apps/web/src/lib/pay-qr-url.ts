import { buildWebPayQrPayload } from '@tms/types';

export function buildPayPageUrl(sessionId: string, tenantId: string, origin?: string): string {
  const webOrigin =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : '') ??
    process.env.NEXT_PUBLIC_WEB_PAY_ORIGIN ??
    '';
  return buildWebPayQrPayload(webOrigin, sessionId, tenantId);
}
