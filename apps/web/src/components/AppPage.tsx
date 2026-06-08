'use client';

import { PageHeader } from '@tms/ui';
import { ApiBanner } from '@/components/ApiBanner';
import { useTenantSite } from '@/lib/tenant-site';

export function AppPage({
  title,
  subtitle,
  actions,
  loading,
  error,
  children,
  showTenantContext = true,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
  /** Append deity · location when subtitle is omitted */
  showTenantContext?: boolean;
}) {
  const site = useTenantSite();
  const resolvedSubtitle =
    subtitle ??
    (showTenantContext ? `${site.deity} · ${site.location}` : undefined);

  return (
    <>
      <PageHeader title={title} subtitle={resolvedSubtitle} actions={actions} />
      {(loading || error) && (
        <ApiBanner loading={!!loading} error={error ?? null} />
      )}
      {children}
    </>
  );
}
