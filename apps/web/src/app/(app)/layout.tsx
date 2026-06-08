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
import { ThemeToggle } from '@/components/ThemeToggle';
import { PublicThemeBar } from '@/components/PublicThemeBar';
import { CommitteeSwitcher } from '@/components/CommitteeSwitcher';
import { CommitteeProvider } from '@/lib/committee-context';
import { useTenantSite } from '@/lib/tenant-site';
import { UserRole } from '@tms/types';

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
  const site = useTenantSite();

  const role = (user?.role ?? 'admin') as AppRole;
  const config = getRoleConfigForUser(role);
  const baseTitle = getPageTitle(pathname);
  const title =
    pathname === '/admin/dashboard'
      ? `${site.name} Dashboard`
      : baseTitle === 'Temple Management System'
        ? site.name
        : baseTitle;
  const isKiosk = pathname.startsWith('/kiosk');
  const isDisplayPage = pathname.startsWith('/frontdesk/display');
  const isFullscreenPage =
    pathname.startsWith('/frontdesk/token-print') ||
    pathname.startsWith('/frontdesk/receipt-print') ||
    isDisplayPage;

  useEffect(() => {
    if (isLoading) return;
    if (isDisplayPage) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !canAccessPath(role, pathname)) {
      router.replace(config.defaultHref);
    }
  }, [isLoading, isAuthenticated, user, role, pathname, router, config.defaultHref, isDisplayPage]);

  if (isDisplayPage) {
    return <main className="displayShell">{children}</main>;
  }

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="authLoading">
        <PublicThemeBar />
        <span className="landingIcon" aria-hidden>
          {site.icon}
        </span>
        <p className="tms-t2">Loading session…</p>
      </div>
    );
  }

  const envVariant =
    environment === 'prod' ? 'prod' : environment === 'uat' ? 'uat' : 'dev';
  const isCommitteeRole = role === UserRole.COMMITTEE;

  const shell = (
    <div className={isKiosk ? 'kioskMode' : undefined}>
      {!isKiosk && !isFullscreenPage && (
        <>
          <DockNav
            items={config.nav}
            variant="sidebar"
            brandLabel={site.name}
            brandIcon={site.icon}
          />
          <TopBar
            title={title}
            envLabel={environment.toUpperCase()}
            envVariant={envVariant}
            avatarInitials={config.avatarInitials}
            themeToggle={<ThemeToggle />}
            roleSwitcher={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {isCommitteeRole && <CommitteeSwitcher />}
                <RoleBadge role={role} />
                <Button size="sm" variant="outline" onClick={logout}>
                  Sign out
                </Button>
              </div>
            }
          />
        </>
      )}
      <main className="appContent compactUi">{children}</main>
    </div>
  );

  if (isCommitteeRole) {
    return <CommitteeProvider>{shell}</CommitteeProvider>;
  }

  return shell;
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
