'use client';

import { Badge, GlassCard } from '@tms/ui';
import { AppPage } from '@/components/AppPage';
import { formatShortDate } from '@/lib/api/endpoints';
import { demoCommitteeDashboard } from '@/lib/demo-fallbacks';
import { useTenantSite } from '@/lib/tenant-site';
import { useApi } from '@/lib/api/use-api';
import { useCommitteeScope } from '@/lib/use-committee-scope';

export default function CommitteeCalendarPage() {
  const site = useTenantSite();
  const { scopeParams, scopeSubtitle, committeeName } = useCommitteeScope();
  const { data, loading, error } = useApi(
    (ep) => ep.getMyCommitteeBlocks(scopeParams),
    [scopeParams.committeeId],
  );
  const blocks =
    data?.data ?? (error ? demoCommitteeDashboard(site.name).upcomingBlocks : []);

  return (
    <AppPage subtitle={scopeSubtitle} loading={loading} error={error} showTenantContext={false}>
      <GlassCard title={`Blocks (${blocks.length})`} compact>
        {blocks.length === 0 ? (
          <p className="hint">No calendar blocks scheduled.</p>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="listRow">
              <div className="listRowMain">
                <div className="listRowTitle">{b.title}</div>
                <p className="hint">{committeeName(b.committeeId)}</p>
                <p className="hint">
                  {formatShortDate(b.startDate)}
                  {b.startDate !== b.endDate && ` – ${formatShortDate(b.endDate)}`}
                </p>
                {b.reason && <p className="hint">{b.reason}</p>}
              </div>
              {b.blocksTempleCalendar && <Badge variant="info">Temple calendar</Badge>}
            </div>
          ))
        )}
      </GlassCard>
    </AppPage>
  );
}
