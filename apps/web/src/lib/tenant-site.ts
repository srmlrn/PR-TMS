'use client';

import { useMemo } from 'react';
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
  const { tenantId } = useTenant();
  return useMemo(
    () => getTenantBranding(resolveActiveTenantId(user?.tenantId, tenantId)),
    [user?.tenantId, tenantId],
  );
}
