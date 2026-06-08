'use client';

import { useMemo } from 'react';
import { Badge, DataTable, GlassCard } from '@tms/ui';
import type { CommitteeReport } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { formatShortDate } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { useCommitteeScope } from '@/lib/use-committee-scope';

export default function CommitteeReportsPage() {
  const { scopeParams, scopeSubtitle, committeeName, isAllCommittees } = useCommitteeScope();
  const { data: reportsData, loading: reportsLoading, error: reportsError } = useApi((ep) =>
    ep.getAllCommitteeReports(),
  );
  const allReports = reportsData?.data ?? [];
  const reports = useMemo(() => {
    if (isAllCommittees || !scopeParams.committeeId) return allReports;
    return allReports.filter((r) => r.committeeId === scopeParams.committeeId);
  }, [allReports, isAllCommittees, scopeParams.committeeId]);

  return (
    <AppPage
      subtitle={scopeSubtitle}
      loading={reportsLoading}
      error={reportsError}
      showTenantContext={false}
    >
      <GlassCard title={`Reports (${reports.length})`} compact>
        <DataTable<CommitteeReport>
          getRowKey={(r) => r.id}
          columns={[
            {
              key: 'committee',
              header: 'Committee',
              render: (r) => committeeName(r.committeeId),
            },
            { key: 'title', header: 'Title', render: (r) => r.title },
            {
              key: 'period',
              header: 'Period',
              render: (r) => (
                <Badge variant="info">{r.period}</Badge>
              ),
            },
            {
              key: 'date',
              header: 'Meeting',
              render: (r) => formatShortDate(r.meetingDate),
            },
            {
              key: 'attendance',
              header: 'Attendance',
              render: (r) =>
                r.expectedAttendance != null
                  ? `${r.attendanceCount}/${r.expectedAttendance}`
                  : String(r.attendanceCount),
            },
            {
              key: 'summary',
              header: 'Summary',
              render: (r) => (
                <span className="hint" style={{ maxWidth: '280px', display: 'inline-block' }}>
                  {r.minutesSummary.length > 80
                    ? `${r.minutesSummary.slice(0, 80)}…`
                    : r.minutesSummary}
                </span>
              ),
            },
          ]}
          data={reports}
        />
        {reports.length === 0 && (
          <p className="hint mt1">No reports yet. Chairs can add reports from the admin committee detail page.</p>
        )}
      </GlassCard>
    </AppPage>
  );
}
