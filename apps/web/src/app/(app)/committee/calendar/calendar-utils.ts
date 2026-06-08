import type { CommitteeCalendarBlock, CommitteeCalendarBlockType } from '@tms/types';

export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export type CalendarFilter = 'all' | 'committee' | 'personal';

export type MonthCell =
  | { key: string; empty: true }
  | { key: string; date: string; day: number; today: boolean };

export function currentMonthKey(): string {
  const now = new Date();
  return monthKey(now.getFullYear(), now.getMonth() + 1);
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split('-').map(Number);
  return { year, month };
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth() + 1);
}

export function monthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function shortMonthLabel(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

export function buildMonthCells(month: string, todayKey: string): MonthCell[] {
  const { year, month: monthNum } = parseMonthKey(month);
  const firstDay = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const cells: MonthCell[] = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push({ key: `empty-${month}-${i}`, empty: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ key: date, date, day, today: date === todayKey });
  }
  return cells;
}

export function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function blocksForDate(
  blocks: CommitteeCalendarBlock[],
  date: string,
): CommitteeCalendarBlock[] {
  return blocks.filter((b) => dateInRange(date, b.startDate, b.endDate));
}

export function filterBlocks(
  blocks: CommitteeCalendarBlock[],
  filter: CalendarFilter,
  userId?: string,
): CommitteeCalendarBlock[] {
  if (filter === 'all') return blocks;
  if (filter === 'personal') {
    return blocks.filter((b) => b.blockType === 'personal' && (!userId || b.createdByUserId === userId));
  }
  return blocks.filter((b) => b.blockType === 'committee' || b.blockType === 'temple');
}

export function blockTypeLabel(type: CommitteeCalendarBlockType): string {
  switch (type) {
    case 'temple':
      return 'Temple event';
    case 'personal':
      return 'My block';
    default:
      return 'Committee event';
  }
}

export function monthHasBlocks(
  blocks: CommitteeCalendarBlock[],
  year: number,
  month: number,
): boolean {
  const prefix = monthKey(year, month);
  return blocks.some((b) => b.startDate.startsWith(prefix) || b.endDate.startsWith(prefix));
}

export function dominantBlockTypeForDate(
  blocks: CommitteeCalendarBlock[],
  date: string,
): CommitteeCalendarBlockType | null {
  const dayBlocks = blocksForDate(blocks, date);
  if (dayBlocks.length === 0) return null;
  if (dayBlocks.some((b) => b.blockType === 'temple')) return 'temple';
  if (dayBlocks.some((b) => b.blockType === 'committee')) return 'committee';
  return 'personal';
}
