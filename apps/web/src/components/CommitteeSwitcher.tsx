'use client';

import { Badge } from '@tms/ui';
import { ALL_COMMITTEES } from '@/lib/committee-selection';
import { useCommitteeContext } from '@/lib/committee-context';

export function CommitteeSwitcher({ layout = 'inline' }: { layout?: 'inline' | 'stacked' }) {
  const {
    committees,
    loading,
    activeCommitteeId,
    setActiveCommitteeId,
    activeCommittee,
    isAllCommittees,
  } = useCommitteeContext();

  if (loading || committees.length === 0) return null;

  const stacked = layout === 'stacked';

  return (
    <div
      className="flexRow"
      style={{
        gap: stacked ? '0.45rem' : '0.35rem',
        alignItems: stacked ? 'stretch' : 'center',
        flexDirection: stacked ? 'column' : 'row',
      }}
    >
      <label
        className="tms-t3"
        style={{
          whiteSpace: stacked ? 'normal' : 'nowrap',
          display: stacked ? 'flex' : undefined,
          flexDirection: stacked ? 'column' : undefined,
          gap: stacked ? '0.35rem' : undefined,
          width: stacked ? '100%' : undefined,
        }}
      >
        Committee
        <select
          value={activeCommitteeId}
          onChange={(e) => setActiveCommitteeId(e.target.value)}
          style={{
            marginLeft: stacked ? 0 : '0.35rem',
            maxWidth: stacked ? 'none' : '12rem',
            width: stacked ? '100%' : undefined,
          }}
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
