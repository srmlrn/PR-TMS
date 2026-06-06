'use client';

import { usePathname } from 'next/navigation';
import { DockNav, TopBar } from '@tms/ui';
import { TenantProvider, useTenant } from '@/lib/tenant-context';
import {
  getPageTitle,
  getRoleConfig,
  resolveRoleFromPath,
  ROLE_CONFIGS,
  type AppRole,
} from '@/lib/roles';

function RoleSelect({ currentRole }: { currentRole: AppRole }) {
  const roles = Object.values(ROLE_CONFIGS).filter((r) => r.key !== 'kiosk');

  return (
    <select
      className="tms-role-select"
      aria-label="Switch role"
      value={currentRole}
      onChange={(e) => {
        const config = ROLE_CONFIGS[e.target.value as AppRole];
        window.location.href = config.defaultHref;
      }}
      style={{
        background: 'var(--ink3)',
        border: '1px solid var(--b)',
        borderRadius: 'var(--rs)',
        padding: '0.33rem 0.65rem',
        color: 'var(--txt)',
        fontSize: '0.78rem',
        outline: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {roles.map((r) => (
        <option key={r.key} value={r.key}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { environment } = useTenant();
  const role = resolveRoleFromPath(pathname);
  const config = getRoleConfig(role);
  const title = getPageTitle(pathname);
  const isKiosk = role === 'kiosk';

  const envVariant =
    environment === 'prod' ? 'prod' : environment === 'uat' ? 'uat' : 'dev';

  return (
    <div className={isKiosk ? 'kioskMode' : undefined}>
      {!isKiosk && (
        <>
          <DockNav items={config.nav} />
          <TopBar
            title={title}
            envLabel={environment.toUpperCase()}
            envVariant={envVariant}
            avatarInitials={config.avatarInitials}
            roleSwitcher={<RoleSelect currentRole={role} />}
          />
        </>
      )}
      <main className="appContent">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </TenantProvider>
  );
}
