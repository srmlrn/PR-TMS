'use client';

import { useState } from 'react';
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
import { createEndpoints, formatMoney, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import styles from './events.module.css';

interface KanbanCard {
  id: string;
  title: string;
  subtitle: string;
  tag?: { label: string; variant: 'pending' | 'info' | 'ok' };
  chip?: string;
  highlight?: boolean;
  faded?: boolean;
}

interface KanbanColumn {
  id: string;
  title: string;
  count: number;
  countVariant?: 'amber' | 'green' | 'blue';
  cards: KanbanCard[];
}

const FALLBACK_PIPELINE: KanbanColumn[] = [
  {
    id: 'enquiry',
    title: 'Enquiry',
    count: 3,
    cards: [
      { id: 'e1', title: 'Patel Wedding', subtitle: 'Main Hall · Sep 14 · 300 pax', tag: { label: 'Awaiting reply', variant: 'pending' } },
      { id: 'e2', title: 'Shastri Family Naming', subtitle: 'Small Hall · Jul 4 · 80 pax' },
    ],
  },
  {
    id: 'quotation',
    title: 'Quotation',
    count: 2,
    cards: [
      { id: 'q1', title: 'TCS Chennai Conf.', subtitle: 'Conf. Room · Aug 5 · 60 pax', tag: { label: 'Quote sent', variant: 'info' } },
    ],
  },
  {
    id: 'confirmed',
    title: 'Confirmed',
    count: 4,
    cards: [
      { id: 'c1', title: 'Brahmotsavam 2026', subtitle: 'All Venues · Jun 8–15', chip: 'Temple Event' },
      { id: 'c2', title: 'Reddy Anniversary', subtitle: 'Kalyana Mand. · Jul 18', tag: { label: 'Deposit paid', variant: 'ok' } },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    count: 1,
    countVariant: 'green',
    cards: [
      { id: 'p1', title: 'Varalakshmi Vratam', subtitle: 'Main Hall · Jun 6', tag: { label: '● Live today', variant: 'ok' }, highlight: true },
    ],
  },
  {
    id: 'completed',
    title: 'Completed',
    count: 12,
    countVariant: 'blue',
    cards: [
      { id: 'd1', title: 'Ugadi 2026', subtitle: 'Completed · Apr 12', faded: true },
      { id: 'd2', title: 'Ram Navami', subtitle: 'Completed · Apr 6', faded: true },
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

const CHECKLIST = [
  { label: 'Volunteer roster', done: true },
  { label: 'Live stream setup', done: true },
  { label: 'Priest schedule', done: true },
  { label: 'Vendor contracts', partial: true },
  { label: 'Prasadam prep orders', partial: true },
  { label: 'Post-event report', done: false },
];

function eventToCard(event: TempleEvent): KanbanCard {
  const venue = event.venues[0] ?? 'TBD';
  const start = formatShortDate(event.startDate);
  const end = formatShortDate(event.endDate);
  const subtitle = `${venue} · ${start}${start !== end ? `–${end}` : ''}${event.expectedFootfall ? ` · ${event.expectedFootfall} pax` : ''}`;

  return {
    id: event.id,
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

function pipelineToColumns(pipeline: Record<EventLifecycleStage, TempleEvent[]>): KanbanColumn[] {
  const stages = [
    EventLifecycleStage.ENQUIRY,
    EventLifecycleStage.QUOTATION,
    EventLifecycleStage.CONFIRMED,
    EventLifecycleStage.IN_PROGRESS,
    EventLifecycleStage.COMPLETED,
  ];

  return stages.map((stage) => {
    const meta = STAGE_META[stage];
    const events = pipeline[stage] ?? [];
    return {
      id: meta.columnId,
      title: meta.title,
      count: events.length,
      countVariant: meta.countVariant,
      cards: events.map(eventToCard),
    };
  });
}

function ApiBanner({ loading, error }: { loading: boolean; error: string | null }) {
  if (!loading && !error) return null;
  return (
    <div className={styles.apiBanner}>
      {loading && 'Loading live data…'}
      {!loading && error && `Using demo data — ${error}`}
    </div>
  );
}

export default function AdminEventsPage() {
  const { api } = useTenant();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'festival' as TempleEvent['type'],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    venues: 'Main Hall',
  });

  const { data: pipeline, loading, error, refetch } = useApi((ep) => ep.getEventPipeline());

  async function handleCreate() {
    setSaving(true);
    try {
      const ep = createEndpoints(api);
      await ep.createEvent({
        name: form.name,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        venues: form.venues.split(',').map((v) => v.trim()).filter(Boolean),
      });
      setShowForm(false);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  const columns = pipeline && !error ? pipelineToColumns(pipeline) : FALLBACK_PIPELINE;
  const featured =
    pipeline && !error
      ? Object.values(pipeline)
          .flat()
          .find((e) => e.name.includes('Brahmotsavam')) ?? Object.values(pipeline).flat()[0]
      : null;

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

      {showForm && (
        <GlassCard title="New event" className="mb2">
          <div className="formGrid">
            <div className="formGroup">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
            <div key={col.id} className={styles.column}>
              <div className={styles.columnHeader}>
                <span>{col.title}</span>
                <Chip variant={col.countVariant ?? 'amber'}>{col.count}</Chip>
              </div>
              {col.cards.map((card) => (
                <div
                  key={card.id}
                  className={[styles.card, card.highlight ? styles.cardHighlight : '', card.faded ? styles.cardFaded : ''].filter(Boolean).join(' ')}
                >
                  <h5>{card.title}</h5>
                  <p>{card.subtitle}</p>
                  {card.chip !== undefined && <Chip className="mt1">{card.chip}</Chip>}
                  {card.tag !== undefined && (
                    <Badge variant={card.tag.variant} className="mt1">
                      {card.tag.label}
                    </Badge>
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
            title={`📋 Event Detail — ${featured?.name ?? 'Brahmotsavam 2026'}`}
            headerRight={
              <div className="flexRow">
                <Badge variant="ok">Confirmed</Badge>
                <Button size="sm">Edit</Button>
              </div>
            }
          >
            <div className="formGrid">
              <div>
                <div className="formGroup">
                  <label>Event Type</label>
                  <div style={{ color: 'var(--amber)', fontWeight: 700 }}>
                    {featured?.type ?? 'Temple Festival'}
                  </div>
                </div>
                <div className="formGroup">
                  <label>Dates</label>
                  <div>
                    {featured
                      ? `${formatShortDate(featured.startDate)} – ${formatShortDate(featured.endDate)}`
                      : 'Jun 8 – Jun 15, 2026 (8 days)'}
                  </div>
                </div>
                <div className="formGroup">
                  <label>Expected Footfall</label>
                  <div>{featured?.expectedFootfall?.toLocaleString() ?? '4,200'} / day</div>
                </div>
              </div>
              <div>
                <div className="formGroup">
                  <label>Venues</label>
                  <div>{featured?.venues.join(', ') ?? 'Main Hall, Kalyana Mandapam, Open Ground'}</div>
                </div>
                <div className="formGroup">
                  <label>Budget</label>
                  <div style={{ color: 'var(--gr)' }}>
                    {featured?.budgetPlanned
                      ? `${formatMoney(featured.budgetPlanned)} planned`
                      : '$82,000 planned'}
                  </div>
                </div>
                <div className="formGroup">
                  <label>Revenue Target</label>
                  <div style={{ color: 'var(--amber)' }}>
                    {featured?.revenueTarget ? formatMoney(featured.revenueTarget) : '$95,000'}
                  </div>
                </div>
              </div>
            </div>
            <div className="divider" />
            <div className="sectionLabel">Checklist Progress</div>
            <div className={styles.checklist}>
              {CHECKLIST.map((item) => (
                <div key={item.label} className="flexRow">
                  <span style={{ color: item.done ? 'var(--gr)' : item.partial ? 'var(--amber)' : 'var(--txt3)' }}>
                    {item.done ? '✓' : item.partial ? '◐' : '○'}
                  </span>
                  <span className="tms-t2">{item.label}</span>
                </div>
              ))}
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
          </GlassCard>
        </BentoItem>
      </BentoGrid>
    </>
  );
}
