/** Sentinel value for aggregated cross-committee views */
export const ALL_COMMITTEES = '__all__';

export function committeeStorageKey(tenantId: string): string {
  return `tms-active-committee-id:${tenantId}`;
}

export function readSelectedCommitteeId(tenantId: string): string {
  if (typeof window === 'undefined') return ALL_COMMITTEES;
  const stored = localStorage.getItem(committeeStorageKey(tenantId));
  return stored || ALL_COMMITTEES;
}

export function writeSelectedCommitteeId(tenantId: string, committeeId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(committeeStorageKey(tenantId), committeeId);
}

export function isAllCommittees(committeeId: string | null | undefined): boolean {
  return !committeeId || committeeId === ALL_COMMITTEES;
}
