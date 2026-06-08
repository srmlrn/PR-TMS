'use client';

import { useCommitteeContext } from '@/lib/committee-context';

export function useCommitteeScope() {
  const ctx = useCommitteeContext();
  const scopeLabel = ctx.isAllCommittees
    ? `All committees (${ctx.committees.length})`
    : (ctx.activeCommittee?.name ?? 'Committee');

  return {
    ...ctx,
    scopeLabel,
    scopeSubtitle: ctx.isAllCommittees
      ? 'Showing work across all your committees'
      : `Focused on ${ctx.activeCommittee?.name ?? 'committee'}`,
  };
}
