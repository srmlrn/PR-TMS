import {
  DEMO_TENANT_IDS,
  GANESHA_TEMPLE_ID,
  getTenantBranding,
  SV_TEMPLE_ID,
  type TenantBranding,
} from '@tms/types';

export const TENANT_STORAGE_KEY = 'tms-tenant-id';

export const SELECTABLE_TENANTS: TenantBranding[] = DEMO_TENANT_IDS.map((id) =>
  getTenantBranding(id),
);

export function getDefaultTenantId(): string {
  return process.env.NEXT_PUBLIC_TENANT_ID ?? SV_TEMPLE_ID;
}

export function readSelectedTenantId(): string {
  if (typeof window === 'undefined') return getDefaultTenantId();
  const stored = localStorage.getItem(TENANT_STORAGE_KEY);
  if (stored && SELECTABLE_TENANTS.some((t) => t.id === stored)) {
    return stored;
  }
  return getDefaultTenantId();
}

export function writeSelectedTenantId(tenantId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
}

export { GANESHA_TEMPLE_ID, SV_TEMPLE_ID };
