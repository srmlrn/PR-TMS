'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTenantBranding, type TenantBranding } from '@tms/types';
import { getDefaultTenantId } from './tenant-selection';
import { useAuth } from './auth-context';
import { useTenant } from './tenant-context';

/** Active tenant id from session or tenant context (storage syncs after mount). */
export function resolveActiveTenantId(
  userTenantId?: string | null,
  contextTenantId?: string,
): string {
  return userTenantId ?? contextTenantId ?? getDefaultTenantId();
}

export function getTenantSite(tenantId: string): TenantBranding {
  return getTenantBranding(tenantId);
}

export function useTenantSite(): TenantBranding {
  const { user } = useAuth();
  const { tenantId, api } = useTenant();
  const resolvedId = resolveActiveTenantId(user?.tenantId, tenantId);
  const fallback = useMemo(() => getTenantBranding(resolvedId), [resolvedId]);
  const [branding, setBranding] = useState<TenantBranding>(fallback);

  useEffect(() => {
    setBranding(fallback);
    let cancelled = false;
    async function load() {
      try {
        const data = await api.get<TenantBranding>('/branding');
        if (!cancelled) {
          setBranding(data);
        }
      } catch {
        if (!cancelled) {
          setBranding(fallback);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [api, fallback, resolvedId]);

  return branding;
}
