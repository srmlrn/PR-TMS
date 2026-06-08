'use client';

import { Badge, GlassCard } from '@tms/ui';
import { AppPage } from '@/components/AppPage';
import { formatShortDate } from '@/lib/api/endpoints';
import { demoCommitteeDashboard } from '@/lib/demo-fallbacks';
import { useTenantSite } from '@/lib/tenant-site';
import { useApi } from '@/lib/api/use-api';

export default function CommitteeCalendarPage() {
  const site = useTenantSite();
  const { data, loading, error } = useApi((ep) => ep.getMyCommitteeBlocks());
  const blocks =
    data?.data ?? (error ? demoCommitteeDashboard(site.name).upcomingBlocks : []);

  return (
    <AppPage
      title="Calendar Blocks"
      subtitle="Blocked dates across your committees"
      loading={loading}
      error={error}
      showTenantContext={false}
    >

      <GlassCard title={`Blocks (${blocks.length})`} compact>
        {blocks.length === 0 ? (
          <p className="hint">No calendar blocks scheduled.</p>
        ) : (
          blocks.map((b) => (
            <div
              key={b.id}
              className="mb2"
              style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}
            >
              <div className="flexRow" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <strong>{b.title}</strong>
                {b.blocksTempleCalendar && (
                  <Badge variant="info">Temple calendar</Badge>
                )}
              </div>
              <p className="hint">
                {formatShortDate(b.startDate)}
                {b.startDate !== b.endDate && ` – ${formatShortDate(b.endDate)}`}
              </p>
              {b.reason && <p>{b.reason}</p>}
            </div>
          ))
        )}
      </GlassCard>
    </AppPage>
  );
}
