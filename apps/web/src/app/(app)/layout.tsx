'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DockNav, TopBar, Button } from '@tms/ui';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { TenantProvider, useTenant } from '@/lib/tenant-context';
import { canAccessPath } from '@/lib/route-access';
import {
  getPageTitle,
  getRoleConfigForUser,
  type AppRole,
} from '@/lib/roles';

function RoleBadge({ role }: { role: AppRole }) {
  const config = getRoleConfigForUser(role);
  return (
    <span className="tms-t3" style={{ marginRight: '0.5rem' }}>
      {config.label}
    </span>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { environment } = useTenant();

  const role = (user?.role ?? 'admin') as AppRole;
  const config = getRoleConfigForUser(role);
  const title = getPageTitle(pathname);
  const isKiosk = pathname.startsWith('/kiosk');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !canAccessPath(role, pathname)) {
      router.replace(config.defaultHref);
    }
  }, [isLoading, isAuthenticated, user, role, pathname, router, config.defaultHref]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="authLoading">
        <span className="landingIcon" aria-hidden>
          🛕
        </span>
        <p className="tms-t2">Loading session…</p>
      </div>
    );
  }

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
            roleSwitcher={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RoleBadge role={role} />
                <Button size="sm" variant="outline" onClick={logout}>
                  Sign out
                </Button>
              </div>
            }
          />
        </>
      )}
      <main className="appContent">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </TenantProvider>
    </AuthProvider>
  );
}
