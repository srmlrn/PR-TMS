'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, GlassCard } from '@tms/ui';
import type {
  CommitteeCalendarBlockType,
  CommitteeRequest,
  CreateCommitteeCalendarBlockInput,
} from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { createEndpoints } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth-context';
import { demoCommitteeDashboard } from '@/lib/demo-fallbacks';
import { useTenant } from '@/lib/tenant-context';
import { useTenantSite } from '@/lib/tenant-site';
import { useApi } from '@/lib/api/use-api';
import { useCommitteeScope } from '@/lib/use-committee-scope';
import {
  WEEKDAYS,
  blockTypeLabel,
  blocksForDate,
  buildMonthCells,
  currentMonthKey,
  dominantBlockTypeForDate,
  filterBlocks,
  formatLocalDateKey,
  formatLocalDateRange,
  localDateKey,
  pendingLeaveForDate,
  monthKey,
  monthLabel,
  parseMonthKey,
  shiftMonth,
  shortMonthLabel,
  type CalendarFilter,
} from './calendar-utils';
import styles from './calendar.module.css';

type CalendarView = 'month' | 'year';

const FILTER_OPTIONS: { value: CalendarFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'committee', label: 'Committee events' },
  { value: 'personal', label: 'My blocks' },
];

const BLOCK_TYPE_OPTIONS: { value: CommitteeCalendarBlockType; label: string }[] = [
  { value: 'committee', label: 'Committee event' },
  { value: 'personal', label: 'My work block' },
  { value: 'temple', label: 'Temple calendar hold' },
];

function eventChipClass(type: CommitteeCalendarBlockType): string {
  switch (type) {
    case 'temple':
      return styles.eventTemple;
    case 'personal':
      return styles.eventPersonal;
    default:
      return styles.eventCommittee;
  }
}

function miniDayClass(type: CommitteeCalendarBlockType | null, today: boolean): string {
  const parts = [styles.miniDay];
  if (!type) parts.push(styles.miniEmpty);
  else if (type === 'temple') parts.push(styles.miniHasTemple);
  else if (type === 'personal') parts.push(styles.miniHasPersonal);
  else parts.push(styles.miniHasCommittee);
  if (today) parts.push(styles.miniToday);
  return parts.join(' ');
}

function emptyBlockForm(date: string): CreateCommitteeCalendarBlockInput {
  return {
    title: '',
    startDate: date,
    endDate: date,
    reason: '',
    blockType: 'committee',
  };
}

export default function CommitteeCalendarPage() {
  const site = useTenantSite();
  const { api } = useTenant();
  const { user } = useAuth();
  const {
    scopeParams,
    scopeSubtitle,
    committeeName,
    committees,
    activeCommittee,
    isAllCommittees,
  } = useCommitteeScope();

  const todayKey = useMemo(() => localDateKey(), []);
  const [view, setView] = useState<CalendarView>('month');
  const [calendarMonth, setCalendarMonth] = useState(currentMonthKey);
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState<CreateCommitteeCalendarBlockInput>(
    emptyBlockForm(todayKey),
  );
  const [formCommitteeId, setFormCommitteeId] = useState('');

  const { data, loading, error, refetch } = useApi(
    (ep) => ep.getMyCommitteeBlocks(scopeParams),
    [scopeParams.committeeId],
  );

  const { data: leaveData } = useApi(
    (ep) => ep.getMyPendingLeave(scopeParams),
    [scopeParams.committeeId],
  );

  const allBlocks =
    data?.data ?? (error ? demoCommitteeDashboard(site.name).upcomingBlocks : []);
  const pendingLeave = leaveData?.data ?? [];

  const blocks = useMemo(
    () => filterBlocks(allBlocks, filter, user?.id),
    [allBlocks, filter, user?.id],
  );

  const { year: viewYear } = parseMonthKey(calendarMonth);
  const monthCells = useMemo(
    () => buildMonthCells(calendarMonth, todayKey),
    [calendarMonth, todayKey],
  );

  const selectedBlocks = useMemo(
    () => (selectedDate ? blocksForDate(blocks, selectedDate) : []),
    [blocks, selectedDate],
  );

  const selectedLeave = useMemo(
    () => (selectedDate ? pendingLeaveForDate(pendingLeave, selectedDate) : []),
    [pendingLeave, selectedDate],
  );

  const defaultCommitteeId =
    activeCommittee?.id ?? committees[0]?.id ?? allBlocks[0]?.committeeId ?? '';

  function openAddBlock(date: string) {
    setSelectedDate(date);
    setBlockForm(emptyBlockForm(date));
    setFormCommitteeId(defaultCommitteeId);
    setShowForm(true);
    setMsg(null);
  }

  function handleDayClick(date: string) {
    openAddBlock(date);
  }

  async function saveBlock() {
    const committeeId = formCommitteeId || defaultCommitteeId;
    if (!committeeId || !blockForm.title.trim()) {
      setMsg('Title and committee are required.');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await createEndpoints(api).createCommitteeCalendarBlock(committeeId, {
        ...blockForm,
        title: blockForm.title.trim(),
        reason: blockForm.reason?.trim() || undefined,
      });
      setShowForm(false);
      setMsg('Block saved.');
      await refetch();
    } catch {
      setMsg('Could not save block. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const toolbar = (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <div className={styles.viewTabs}>
          <button
            type="button"
            className={[styles.viewTab, view === 'month' ? styles.viewTabActive : ''].join(' ')}
            onClick={() => setView('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={[styles.viewTab, view === 'year' ? styles.viewTabActive : ''].join(' ')}
            onClick={() => setView('year')}
          >
            Year plan
          </button>
        </div>
        <select
          className={styles.select}
          value={filter}
          onChange={(e) => setFilter(e.target.value as CalendarFilter)}
          aria-label="Filter blocks"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {view === 'month' && (
        <div className={styles.toolbarGroup}>
          <Button size="sm" onClick={() => setCalendarMonth((m) => shiftMonth(m, -1))}>
            ‹
          </Button>
          <span className={styles.monthTitle}>{monthLabel(calendarMonth)}</span>
          <Button size="sm" onClick={() => setCalendarMonth((m) => shiftMonth(m, 1))}>
            ›
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCalendarMonth(currentMonthKey());
              handleDayClick(todayKey);
            }}
          >
            Today
          </Button>
        </div>
      )}
      {view === 'year' && (
        <div className={styles.toolbarGroup}>
          <Button size="sm" onClick={() => setCalendarMonth(monthKey(viewYear - 1, 1))}>
            ‹
          </Button>
          <span className={styles.monthTitle}>{viewYear}</span>
          <Button size="sm" onClick={() => setCalendarMonth(monthKey(viewYear + 1, 1))}>
            ›
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <AppPage subtitle={scopeSubtitle} loading={loading} error={error} showTenantContext={false}>
      <GlassCard title="Committee calendar" compact headerRight={toolbar}>
        <div className={styles.layout}>
          <div>
            {view === 'month' ? (
              <>
                <div className={styles.cal}>
                  {WEEKDAYS.map((d) => (
                    <div key={d} className={styles.calHead}>
                      {d}
                    </div>
                  ))}
                  {monthCells.map((cell) => {
                    if ('empty' in cell && cell.empty) {
                      return <div key={cell.key} className={[styles.calDay, styles.calEmpty].join(' ')} />;
                    }
                    if ('empty' in cell) return null;
                    const dayBlocks = blocksForDate(blocks, cell.date);
                    const dayLeave = pendingLeaveForDate(pendingLeave, cell.date);
                    const visible = dayBlocks.slice(0, 2);
                    const visibleLeave = dayLeave.slice(0, Math.max(0, 2 - visible.length));
                    const extra =
                      dayBlocks.length -
                      visible.length +
                      dayLeave.length -
                      visibleLeave.length;
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        className={[
                          styles.calDay,
                          cell.today ? styles.calToday : '',
                          selectedDate === cell.date ? styles.calSelected : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => handleDayClick(cell.date)}
                      >
                        <span className={styles.dayNum}>{cell.day}</span>
                        {visible.map((b) => (
                          <span
                            key={b.id}
                            className={[styles.eventChip, eventChipClass(b.blockType)].join(' ')}
                          >
                            {b.title}
                          </span>
                        ))}
                        {visibleLeave.map((r) => (
                          <span
                            key={r.id}
                            className={[styles.eventChip, styles.eventPendingLeave].join(' ')}
                            title="Pending leave approval"
                          >
                            Leave: {r.requestedByName ?? 'Member'}
                          </span>
                        ))}
                        {extra > 0 && <span className={styles.moreChip}>+{extra} more</span>}
                      </button>
                    );
                  })}
                </div>
                <div className={styles.legend}>
                  <span className="flexRow">
                    <span className={[styles.legendDot, styles.eventTemple].join(' ')} /> Temple
                  </span>
                  <span className="flexRow">
                    <span className={[styles.legendDot, styles.eventCommittee].join(' ')} /> Committee
                  </span>
                  <span className="flexRow">
                    <span className={[styles.legendDot, styles.eventPersonal].join(' ')} /> Personal
                  </span>
                  <span className="flexRow">
                    <span className={[styles.legendDot, styles.eventPendingLeave].join(' ')} />{' '}
                    Pending leave
                  </span>
                </div>
              </>
            ) : (
              <div className={styles.yearGrid}>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1;
                  const key = monthKey(viewYear, month);
                  const miniCells = buildMonthCells(key, todayKey);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={styles.yearMonth}
                      onClick={() => {
                        setCalendarMonth(key);
                        setView('month');
                      }}
                    >
                      <div className={styles.yearMonthTitle}>{shortMonthLabel(month)}</div>
                      <div className={styles.miniCal}>
                        {miniCells.map((cell) => {
                          if ('empty' in cell && cell.empty) {
                            return <span key={cell.key} className={styles.miniDay} />;
                          }
                          if ('empty' in cell) return null;
                          const dominant = dominantBlockTypeForDate(blocks, cell.date);
                          return (
                            <span
                              key={cell.key}
                              className={miniDayClass(dominant, cell.today)}
                              title={cell.date}
                            />
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <GlassCard
            title={
              selectedDate
                ? formatLocalDateKey(selectedDate, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Select a date'
            }
            compact
            headerRight={
              selectedDate && !showForm ? (
                <Button size="sm" onClick={() => openAddBlock(selectedDate)}>
                  Add event
                </Button>
              ) : undefined
            }
          >
            <div className={styles.detailPanel}>
              {msg && <p className="hint">{msg}</p>}

              {selectedDate && selectedLeave.length > 0 && (
                <div className={styles.blockList}>
                  <p className={styles.formLabel}>Pending leave</p>
                  {selectedLeave.map((r: CommitteeRequest) => (
                    <div key={r.id} className={styles.blockItem}>
                      <div className={styles.blockItemHead}>
                        <div>
                          <div className={styles.blockItemTitle}>{r.title}</div>
                          <p className="hint">
                            {committeeName(r.committeeId)} · {r.requestedByName ?? 'Member'}
                          </p>
                        </div>
                        <Badge variant="pending">Awaiting approval</Badge>
                      </div>
                      {r.blockStartDate && r.blockEndDate && (
                        <p className="hint">
                          {formatLocalDateRange(r.blockStartDate, r.blockEndDate)}
                        </p>
                      )}
                      {r.description && <p className="hint">{r.description}</p>}
                    </div>
                  ))}
                </div>
              )}

              {selectedDate && selectedBlocks.length > 0 && (
                <div className={styles.blockList}>
                  {selectedBlocks.map((b) => (
                    <div key={b.id} className={styles.blockItem}>
                      <div className={styles.blockItemHead}>
                        <div>
                          <div className={styles.blockItemTitle}>{b.title}</div>
                          <p className="hint">{committeeName(b.committeeId)}</p>
                        </div>
                        <Badge
                          variant={
                            b.blockType === 'temple'
                              ? 'pending'
                              : b.blockType === 'personal'
                                ? 'ok'
                                : 'info'
                          }
                        >
                          {blockTypeLabel(b.blockType)}
                        </Badge>
                      </div>
                      <p className="hint">{formatLocalDateRange(b.startDate, b.endDate)}</p>
                      {b.reason && <p className="hint">{b.reason}</p>}
                    </div>
                  ))}
                </div>
              )}

              {showForm && selectedDate ? (
                <div className="formStack">
                  <p className={styles.formLabel}>New event</p>
                  <label>
                    Block type
                    <select
                      value={blockForm.blockType ?? 'committee'}
                      onChange={(e) =>
                        setBlockForm({
                          ...blockForm,
                          blockType: e.target.value as CommitteeCalendarBlockType,
                        })
                      }
                    >
                      {BLOCK_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isAllCommittees && (
                    <label>
                      Committee
                      <select
                        value={formCommitteeId || defaultCommitteeId}
                        onChange={(e) => setFormCommitteeId(e.target.value)}
                      >
                        {committees.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Title
                    <input
                      value={blockForm.title}
                      onChange={(e) => setBlockForm({ ...blockForm, title: e.target.value })}
                    />
                  </label>
                  <label>
                    Start
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) =>
                        setBlockForm({ ...blockForm, startDate: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    End
                    <input
                      type="date"
                      value={blockForm.endDate}
                      onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                    />
                  </label>
                  <label>
                    Notes
                    <textarea
                      rows={2}
                      value={blockForm.reason ?? ''}
                      onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                    />
                  </label>
                  <div className="flexRow">
                    <Button size="sm" disabled={saving} onClick={() => void saveBlock()}>
                      Save event
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setMsg(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : !selectedDate ? (
                <p className="hint">Click a date on the calendar to add an event.</p>
              ) : selectedBlocks.length === 0 && selectedLeave.length === 0 ? (
                <p className="hint">No events on this date. Use Add event to create one.</p>
              ) : null}
            </div>
          </GlassCard>
        </div>
      </GlassCard>
    </AppPage>
  );
}
