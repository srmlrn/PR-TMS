'use client';

import { Badge } from '@tms/ui';
import { ALL_COMMITTEES } from '@/lib/committee-selection';
import { useCommitteeContext } from '@/lib/committee-context';

export function CommitteeSwitcher() {
  const {
    committees,
    loading,
    activeCommitteeId,
    setActiveCommitteeId,
    activeCommittee,
    isAllCommittees,
  } = useCommitteeContext();

  if (loading || committees.length === 0) return null;

  return (
    <div className="flexRow" style={{ gap: '0.35rem', alignItems: 'center' }}>
      <label className="tms-t3" style={{ whiteSpace: 'nowrap' }}>
        Committee
        <select
          value={activeCommitteeId}
          onChange={(e) => setActiveCommitteeId(e.target.value)}
          style={{ marginLeft: '0.35rem', maxWidth: '12rem' }}
          aria-label="Active committee"
        >
          <option value={ALL_COMMITTEES}>All committees ({committees.length})</option>
          {committees.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {!isAllCommittees && activeCommittee?.myDisplayTitle && (
        <Badge variant="info">{activeCommittee.myDisplayTitle}</Badge>
      )}
      {!isAllCommittees && activeCommittee?.myRole && !activeCommittee.myDisplayTitle && (
        <Badge variant="info">{activeCommittee.myRole.replace('_', ' ')}</Badge>
      )}
    </div>
  );
}
