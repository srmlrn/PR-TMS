'use client';

import { useMemo } from 'react';
import { getTenantBranding, type TenantBranding } from '@tms/types';
import { useAuth } from './auth-context';
import { useTenant } from './tenant-context';
import { readSelectedTenantId } from './tenant-selection';

/** Active tenant id from session, context, or local selection */
export function resolveActiveTenantId(
  userTenantId?: string | null,
  contextTenantId?: string,
): string {
  return userTenantId ?? contextTenantId ?? readSelectedTenantId();
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
