'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  BentoGrid,
  BentoItem,
  Button,
  Chip,
  GlassCard,
  PageHeader,
  ProgressBar,
} from '@tms/ui';
import { EventLifecycleStage, type TempleEvent } from '@tms/types';
import {
  createEndpoints,
  formatMoney,
  formatShortDate,
  type EventBudgetSnapshot,
  type EventPipeline,
} from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import styles from './events.module.css';

interface KanbanCard {
  id: string;
  title: string;
  subtitle: string;
  stage: EventLifecycleStage;
  tag?: { label: string; variant: 'pending' | 'info' | 'ok' };
  chip?: string;
  highlight?: boolean;
  faded?: boolean;
}

interface KanbanColumn {
  id: string;
  stage: EventLifecycleStage;
  title: string;
  count: number;
  countVariant?: 'amber' | 'green' | 'blue';
  cards: KanbanCard[];
}

const FALLBACK_PIPELINE: KanbanColumn[] = [
  {
    id: 'enquiry',
    stage: EventLifecycleStage.ENQUIRY,
    title: 'Enquiry',
    count: 3,
    cards: [
      { id: 'e1', stage: EventLifecycleStage.ENQUIRY, title: 'Patel Wedding', subtitle: 'Main Hall · Sep 14 · 300 pax', tag: { label: 'Awaiting reply', variant: 'pending' } },
      { id: 'e2', stage: EventLifecycleStage.ENQUIRY, title: 'Shastri Family Naming', subtitle: 'Small Hall · Jul 4 · 80 pax' },
    ],
  },
  {
    id: 'quotation',
    stage: EventLifecycleStage.QUOTATION,
    title: 'Quotation',
    count: 2,
    cards: [
      { id: 'q1', stage: EventLifecycleStage.QUOTATION, title: 'TCS Chennai Conf.', subtitle: 'Conf. Room · Aug 5 · 60 pax', tag: { label: 'Quote sent', variant: 'info' } },
    ],
  },
  {
    id: 'confirmed',
    stage: EventLifecycleStage.CONFIRMED,
    title: 'Confirmed',
    count: 4,
    cards: [
      { id: 'c1', stage: EventLifecycleStage.CONFIRMED, title: 'Brahmotsavam 2026', subtitle: 'All Venues · Jun 8–15', chip: 'Temple Event' },
      { id: 'c2', stage: EventLifecycleStage.CONFIRMED, title: 'Reddy Anniversary', subtitle: 'Kalyana Mand. · Jul 18', tag: { label: 'Deposit paid', variant: 'ok' } },
    ],
  },
  {
    id: 'in-progress',
    stage: EventLifecycleStage.IN_PROGRESS,
    title: 'In Progress',
    count: 1,
    countVariant: 'green',
    cards: [
      { id: 'p1', stage: EventLifecycleStage.IN_PROGRESS, title: 'Varalakshmi Vratam', subtitle: 'Main Hall · Jun 6', tag: { label: '● Live today', variant: 'ok' }, highlight: true },
    ],
  },
  {
    id: 'completed',
    stage: EventLifecycleStage.COMPLETED,
    title: 'Completed',
    count: 12,
    countVariant: 'blue',
    cards: [
      { id: 'd1', stage: EventLifecycleStage.COMPLETED, title: 'Ugadi 2026', subtitle: 'Completed · Apr 12', faded: true },
      { id: 'd2', stage: EventLifecycleStage.COMPLETED, title: 'Ram Navami', subtitle: 'Completed · Apr 6', faded: true },
    ],
  },
];

const STAGE_META: Record<
  EventLifecycleStage,
  { columnId: string; title: string; countVariant?: 'amber' | 'green' | 'blue' }
> = {
  [EventLifecycleStage.ENQUIRY]: { columnId: 'enquiry', title: 'Enquiry' },
  [EventLifecycleStage.QUOTATION]: { columnId: 'quotation', title: 'Quotation' },
  [EventLifecycleStage.CONFIRMED]: { columnId: 'confirmed', title: 'Confirmed' },
  [EventLifecycleStage.IN_PROGRESS]: { columnId: 'in-progress', title: 'In Progress', countVariant: 'green' },
  [EventLifecycleStage.COMPLETED]: { columnId: 'completed', title: 'Completed', countVariant: 'blue' },
  [EventLifecycleStage.CANCELLED]: { columnId: 'cancelled', title: 'Cancelled' },
};

const STAGE_BADGE: Record<EventLifecycleStage, 'pending' | 'info' | 'ok'> = {
  [EventLifecycleStage.ENQUIRY]: 'pending',
  [EventLifecycleStage.QUOTATION]: 'info',
  [EventLifecycleStage.CONFIRMED]: 'ok',
  [EventLifecycleStage.IN_PROGRESS]: 'ok',
  [EventLifecycleStage.COMPLETED]: 'ok',
  [EventLifecycleStage.CANCELLED]: 'pending',
};

const KANBAN_STAGES = [
  EventLifecycleStage.ENQUIRY,
  EventLifecycleStage.QUOTATION,
  EventLifecycleStage.CONFIRMED,
  EventLifecycleStage.IN_PROGRESS,
  EventLifecycleStage.COMPLETED,
];

function eventToCard(event: TempleEvent): KanbanCard {
  const venue = event.venues[0] ?? 'TBD';
  const start = formatShortDate(event.startDate);
  const end = formatShortDate(event.endDate);
  const subtitle = `${venue} · ${start}${start !== end ? `–${end}` : ''}${event.expectedFootfall ? ` · ${event.expectedFootfall} pax` : ''}`;

  return {
    id: event.id,
    stage: event.stage,
    title: event.name,
    subtitle,
    chip: event.type === 'festival' ? 'Temple Event' : undefined,
    highlight: event.stage === EventLifecycleStage.IN_PROGRESS,
    faded: event.stage === EventLifecycleStage.COMPLETED,
    tag:
      event.stage === EventLifecycleStage.ENQUIRY
        ? { label: 'Awaiting reply', variant: 'pending' }
        : event.stage === EventLifecycleStage.QUOTATION
          ? { label: 'Quote sent', variant: 'info' }
          : event.stage === EventLifecycleStage.CONFIRMED
            ? { label: 'Deposit paid', variant: 'ok' }
            : event.stage === EventLifecycleStage.IN_PROGRESS
              ? { label: '● Live today', variant: 'ok' }
              : undefined,
  };
}

function pipelineToColumns(pipeline: EventPipeline): KanbanColumn[] {
  return KANBAN_STAGES.map((stage) => {
    const meta = STAGE_META[stage];
    const events = pipeline[stage] ?? [];
    return {
      id: meta.columnId,
      stage,
      title: meta.title,
      count: events.length,
      countVariant: meta.countVariant,
      cards: events.map(eventToCard),
    };
  });
}

function flattenPipeline(pipeline: EventPipeline): TempleEvent[] {
  return KANBAN_STAGES.flatMap((stage) => pipeline[stage] ?? []);
}

function ApiBanner({ loading, error }: { loading: boolean; error: string | null }) {
  if (!loading && !error) return null;
  return (
    <div className="apiBanner">
      {loading && 'Loading live data…'}
      {!loading && error && `Using demo data — ${error}`}
    </div>
  );
}

export default function AdminEventsPage() {
  const { api } = useTenant();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formOk, setFormOk] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageMsg, setStageMsg] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'festival' as TempleEvent['type'],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    venues: 'Main Hall',
    clientName: '',
    expectedFootfall: 0,
  });

  const { data: pipeline, loading, error, refetch } = useApi((ep) => ep.getEventPipeline());

  const liveEvents = pipeline && !error ? flattenPipeline(pipeline) : [];
  const selectedEvent = liveEvents.find((e) => e.id === selectedId) ?? liveEvents[0] ?? null;
  const selectedIdForApi = selectedEvent?.id ?? null;

  useEffect(() => {
    if (liveEvents.length && !selectedId) {
      const featured = liveEvents.find((e) => e.name.includes('Brahmotsavam')) ?? liveEvents[0];
      setSelectedId(featured.id);
    }
  }, [liveEvents, selectedId]);

  const { data: checklist } = useApi(
    async (ep) => {
      if (!selectedIdForApi) return [];
      return ep.getEventChecklist(selectedIdForApi);
    },
    [selectedIdForApi],
  );

  const { data: budget } = useApi(
    async (ep) => {
      if (!selectedIdForApi) return null;
      return ep.getEventBudget(selectedIdForApi);
    },
    [selectedIdForApi],
  );

  async function handleCreate() {
    setSaving(true);
    setFormMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.createEvent({
        name: form.name,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        venues: form.venues.split(',').map((v) => v.trim()).filter(Boolean),
        clientName: form.clientName || undefined,
        expectedFootfall: form.expectedFootfall || undefined,
      });
      setShowForm(false);
      setFormOk(true);
      setFormMsg(`Event "${form.name}" created.`);
      refetch();
    } catch (err) {
      setFormOk(false);
      setFormMsg(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function moveEventToStage(eventId: string, targetStage: EventLifecycleStage) {
    setStageMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.updateEventStage(eventId, targetStage);
      refetch();
    } catch (err) {
      setStageMsg(err instanceof Error ? err.message : 'Stage update failed');
    }
  }

  const columns = pipeline && !error ? pipelineToColumns(pipeline) : FALLBACK_PIPELINE;

  const nextStage = useMemo(() => {
    if (!selectedEvent) return null;
    const idx = KANBAN_STAGES.indexOf(selectedEvent.stage);
    if (idx < 0 || idx >= KANBAN_STAGES.length - 1) return null;
    return KANBAN_STAGES[idx + 1];
  }, [selectedEvent]);

  function renderBudget(b: EventBudgetSnapshot | null | undefined) {
    if (!b) {
      return (
        <>
          <div className="flexBetween tms-t2 mb1">
            <span>Donations</span>
            <strong style={{ color: 'var(--gr)' }}>$48,000</strong>
          </div>
          <ProgressBar value={62} color="green" />
          <div className="flexBetween tms-t2 mt2 mb1">
            <span>Bookings</span>
            <strong style={{ color: 'var(--amber)' }}>$22,000</strong>
          </div>
          <ProgressBar value={28} color="amber" />
          <div className="flexBetween tms-t2 mt2 mb1">
            <span>Sponsorships</span>
            <strong style={{ color: 'var(--bl)' }}>$18,000</strong>
          </div>
          <ProgressBar value={23} color="blue" />
          <div className="divider" />
          <div className="flexBetween tms-t2 mb1">
            <span>Catering</span>
            <strong style={{ color: 'var(--red)' }}>-$14,000</strong>
          </div>
          <div className="flexBetween tms-t2 mb1">
            <span>PA / A/V</span>
            <strong style={{ color: 'var(--red)' }}>-$3,200</strong>
          </div>
          <div className="flexBetween tms-t2">
            <span>Decoration</span>
            <strong style={{ color: 'var(--red)' }}>-$5,600</strong>
          </div>
          <div className="divider" />
          <div className="flexBetween">
            <span style={{ fontWeight: 700 }}>Net Surplus</span>
            <strong style={{ color: 'var(--gr)', fontSize: '1.1rem' }}>$65,200</strong>
          </div>
        </>
      );
    }

    const incomeTotal = b.income.total || 1;
    return (
      <>
        <div className="flexBetween tms-t2 mb1">
          <span>Donations</span>
          <strong style={{ color: 'var(--gr)' }}>{formatMoney(b.income.donations)}</strong>
        </div>
        <ProgressBar value={Math.round((b.income.donations / incomeTotal) * 100)} color="green" />
        <div className="flexBetween tms-t2 mt2 mb1">
          <span>Bookings</span>
          <strong style={{ color: 'var(--amber)' }}>{formatMoney(b.income.bookings)}</strong>
        </div>
        <ProgressBar value={Math.round((b.income.bookings / incomeTotal) * 100)} color="amber" />
        <div className="flexBetween tms-t2 mt2 mb1">
          <span>Sponsorships</span>
          <strong style={{ color: 'var(--bl)' }}>{formatMoney(b.income.sponsorships)}</strong>
        </div>
        <ProgressBar value={Math.round((b.income.sponsorships / incomeTotal) * 100)} color="blue" />
        <div className="divider" />
        <div className="flexBetween tms-t2 mb1">
          <span>Catering</span>
          <strong style={{ color: 'var(--red)' }}>-{formatMoney(b.expenses.catering)}</strong>
        </div>
        <div className="flexBetween tms-t2 mb1">
          <span>PA / A/V</span>
          <strong style={{ color: 'var(--red)' }}>-{formatMoney(b.expenses.avEquipment)}</strong>
        </div>
        <div className="flexBetween tms-t2">
          <span>Decoration</span>
          <strong style={{ color: 'var(--red)' }}>-{formatMoney(b.expenses.decoration)}</strong>
        </div>
        <div className="divider" />
        <div className="flexBetween">
          <span style={{ fontWeight: 700 }}>Net Surplus</span>
          <strong style={{ color: 'var(--gr)', fontSize: '1.1rem' }}>{formatMoney(b.netSurplus)}</strong>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Event Management"
        subtitle="Full lifecycle — Enquiry → Contract → Live → Report"
        actions={
          <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New Event'}
          </Button>
        }
      />

      <ApiBanner loading={loading} error={error} />

      {formMsg && (
        <p className="tms-t2 mb2" style={{ color: formOk ? 'var(--gr)' : 'var(--red)' }}>
          {formMsg}
        </p>
      )}
      {stageMsg && (
        <p className="tms-t2 mb2" style={{ color: 'var(--red)' }}>{stageMsg}</p>
      )}

      {showForm && (
        <GlassCard title="New event" className="mb2">
          <div className="formGrid">
            <div className="formGroup">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="formGroup">
              <label>Client name</label>
              <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            </div>
            <div className="formGroup">
              <label>Start date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="formGroup">
              <label>End date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="formGroup">
              <label>Expected footfall</label>
              <input
                type="number"
                value={form.expectedFootfall || ''}
                onChange={(e) => setForm({ ...form, expectedFootfall: Number(e.target.value) })}
              />
            </div>
            <div className="formGroup">
              <label>Venues (comma-separated)</label>
              <input value={form.venues} onChange={(e) => setForm({ ...form, venues: e.target.value })} />
            </div>
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <Button onClick={handleCreate} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Create event'}</Button>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="mb2">
        <div className="sectionLabel">Event Pipeline</div>
        <div className={styles.kanban}>
          {columns.map((col) => (
            <div
              key={col.id}
              className={[styles.column, dragOverColumn === col.id ? styles.columnDragOver : ''].filter(Boolean).join(' ')}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.id);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                const eventId = e.dataTransfer.getData('text/event-id');
                if (eventId && pipeline && !error) {
                  void moveEventToStage(eventId, col.stage);
                }
              }}
            >
              <div className={styles.columnHeader}>
                <span>{col.title}</span>
                <Chip variant={col.countVariant ?? 'amber'}>{col.count}</Chip>
              </div>
              {col.cards.map((card) => (
                <div
                  key={card.id}
                  draggable={Boolean(pipeline && !error)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/event-id', card.id);
                    setSelectedId(card.id);
                  }}
                  onClick={() => setSelectedId(card.id)}
                  className={[
                    styles.card,
                    card.highlight ? styles.cardHighlight : '',
                    card.faded ? styles.cardFaded : '',
                    selectedId === card.id ? styles.cardSelected : '',
                  ].filter(Boolean).join(' ')}
                >
                  <h5>{card.title}</h5>
                  <p>{card.subtitle}</p>
                  {card.chip !== undefined && <Chip className="mt1">{card.chip}</Chip>}
                  {card.tag !== undefined && (
                    <Badge variant={card.tag.variant} className="mt1">
                      {card.tag.label}
                    </Badge>
                  )}
                  {pipeline && !error && (
                    <div className={styles.stageActions}>
                      {KANBAN_STAGES.filter((s) => s !== card.stage).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={styles.stageBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            void moveEventToStage(card.id, s);
                          }}
                        >
                          → {STAGE_META[s].title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <BentoGrid>
        <BentoItem span={8}>
          <GlassCard
            title={`📋 Event Detail — ${selectedEvent?.name ?? 'Brahmotsavam 2026'}`}
            headerRight={
              <div className="flexRow">
                <Badge variant={selectedEvent ? STAGE_BADGE[selectedEvent.stage] : 'ok'}>
                  {selectedEvent ? STAGE_META[selectedEvent.stage].title : 'Confirmed'}
                </Badge>
                {nextStage && selectedEvent && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => moveEventToStage(selectedEvent.id, nextStage)}
                  >
                    Advance to {STAGE_META[nextStage].title}
                  </Button>
                )}
              </div>
            }
          >
            <div className="formGrid">
              <div>
                <div className="formGroup">
                  <label>Event Type</label>
                  <div style={{ color: 'var(--amber)', fontWeight: 700 }}>
                    {selectedEvent?.type ?? 'Temple Festival'}
                  </div>
                </div>
                <div className="formGroup">
                  <label>Client</label>
                  <div>{selectedEvent?.clientName ?? '—'}</div>
                </div>
                <div className="formGroup">
                  <label>Dates</label>
                  <div>
                    {selectedEvent
                      ? `${formatShortDate(selectedEvent.startDate)} – ${formatShortDate(selectedEvent.endDate)}`
                      : 'Jun 8 – Jun 15, 2026 (8 days)'}
                  </div>
                </div>
                <div className="formGroup">
                  <label>Expected Footfall</label>
                  <div>{selectedEvent?.expectedFootfall?.toLocaleString() ?? '4,200'} / day</div>
                </div>
              </div>
              <div>
                <div className="formGroup">
                  <label>Venues</label>
                  <div>{selectedEvent?.venues.join(', ') ?? 'Main Hall, Kalyana Mandapam, Open Ground'}</div>
                </div>
                <div className="formGroup">
                  <label>Budget</label>
                  <div style={{ color: 'var(--gr)' }}>
                    {budget
                      ? `${formatMoney(budget.plannedBudget)} planned`
                      : selectedEvent?.budgetPlanned
                        ? `${formatMoney(selectedEvent.budgetPlanned)} planned`
                        : '$82,000 planned'}
                  </div>
                </div>
                <div className="formGroup">
                  <label>Revenue Target</label>
                  <div style={{ color: 'var(--amber)' }}>
                    {budget
                      ? formatMoney(budget.revenueTarget)
                      : selectedEvent?.revenueTarget
                        ? formatMoney(selectedEvent.revenueTarget)
                        : '$95,000'}
                  </div>
                </div>
              </div>
            </div>
            <div className="divider" />
            <div className="sectionLabel">Checklist Progress</div>
            <div className={styles.checklist}>
              {(checklist && checklist.length > 0 ? checklist : []).map((item) => (
                <div key={item.id} className="flexRow">
                  <span style={{ color: item.isDone ? 'var(--gr)' : 'var(--txt3)' }}>
                    {item.isDone ? '✓' : '○'}
                  </span>
                  <span className="tms-t2">{item.title}</span>
                </div>
              ))}
              {(!checklist || checklist.length === 0) && (
                <>
                  <div className="flexRow">
                    <span style={{ color: 'var(--gr)' }}>✓</span>
                    <span className="tms-t2">Volunteer roster</span>
                  </div>
                  <div className="flexRow">
                    <span style={{ color: 'var(--gr)' }}>✓</span>
                    <span className="tms-t2">Live stream setup</span>
                  </div>
                  <div className="flexRow">
                    <span style={{ color: 'var(--amber)' }}>◐</span>
                    <span className="tms-t2">Vendor contracts</span>
                  </div>
                </>
              )}
            </div>
            <div className="divider" />
            <div className="flexRow flexWrap">
              <Button variant="primary" size="sm">View Full Plan</Button>
              <Button size="sm">Budget Tracker</Button>
              <Button size="sm">Send Invites</Button>
              <Button size="sm">Post-Event Report</Button>
            </div>
          </GlassCard>
        </BentoItem>
        <BentoItem span={4}>
          <GlassCard title="Budget Snapshot">
            {renderBudget(budget)}
          </GlassCard>
        </BentoItem>
      </BentoGrid>
    </>
  );
}
