'use client';

import { ApiBanner } from '@/components/ApiBanner';
import { useTenantSite } from '@/lib/tenant-site';

export function PageIntro({
  subtitle,
  actions,
  showTenantContext = true,
}: {
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  showTenantContext?: boolean;
}) {
  const site = useTenantSite();
  const resolvedSubtitle =
    subtitle ??
    (showTenantContext ? `${site.deity} · ${site.location}` : undefined);

  if (!resolvedSubtitle && !actions) return null;

  const actionsOnly = !resolvedSubtitle && Boolean(actions);

  return (
    <div className={actionsOnly ? 'pageIntro pageIntroActionsOnly' : 'pageIntro'}>
      {resolvedSubtitle && <p className="pageIntroSubtitle">{resolvedSubtitle}</p>}
      {actions && <div className="pageIntroActions">{actions}</div>}
    </div>
  );
}

export function AppPage({
  title: _title,
  subtitle,
  actions,
  loading,
  error,
  children,
  showTenantContext = true,
}: {
  /** Kept for call-site clarity; page title is shown in the app TopBar */
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
  showTenantContext?: boolean;
}) {
  const site = useTenantSite();
  const resolvedSubtitle =
    subtitle ??
    (showTenantContext ? `${site.deity} · ${site.location}` : undefined);

  return (
    <div className="pageShell">
      <PageIntro subtitle={resolvedSubtitle} actions={actions} showTenantContext={false} />
      {(loading || error) && (
        <ApiBanner loading={!!loading} error={error ?? null} />
      )}
      {children}
    </div>
  );
}
