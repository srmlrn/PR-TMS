'use client';

import { Badge, GlassCard } from '@tms/ui';
import type { CommitteeMember, CommitteeRosterCategory } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { useApi } from '@/lib/api/use-api';

function formatMemberLine(member: CommitteeMember): string {
  const title = member.displayTitle ?? (member.role === 'chair' ? 'Chair' : member.role === 'vice_chair' ? 'Co-Chair' : null);
  return title ? `${member.name} — ${title}` : member.name;
}

function RosterCategory({ group }: { group: CommitteeRosterCategory }) {
  return (
    <GlassCard title={group.label} compact>
      {group.committees.map(({ committee, members }) => (
        <div key={committee.id} className="mb2" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <div className="flexRow" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div className="listRowTitle">{committee.name}</div>
              {committee.purpose && <p className="hint">{committee.purpose}</p>}
            </div>
            <div className="flexRow" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
              <Badge variant="info">{committee.committeeType.replace('_', ' ')}</Badge>
              {committee.meetingCadence && (
                <Badge variant="pending">{committee.meetingCadence.replace('_', ' ')}</Badge>
              )}
            </div>
          </div>
          <ul className="hint mt1" style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            {members.map((m) => (
              <li key={m.id}>{formatMemberLine(m)}</li>
            ))}
          </ul>
        </div>
      ))}
    </GlassCard>
  );
}

export default function CommitteeDirectoryPage() {
  const { data, loading, error } = useApi((ep) => ep.getCommitteeRoster());
  const roster = data;

  return (
    <AppPage
      subtitle="Temple committees and members, grouped by category"
      loading={loading}
      error={error}
      showTenantContext={false}
    >
      {roster && (
        <>
          {roster.categories.length === 0 ? (
            <p className="hint">No public committee rosters available.</p>
          ) : (
            roster.categories.map((group) => (
              <RosterCategory key={group.category} group={group} />
            ))
          )}
        </>
      )}
    </AppPage>
  );
}
