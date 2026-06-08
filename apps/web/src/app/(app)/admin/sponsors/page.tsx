'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  BentoGrid,
  BentoItem,
  Button,
  Chip,
  DataTable,
  GlassCard,
  ProgressBar,
  StatTile,
  dataTableAmountStyles,
} from '@tms/ui';
import {
  Currency,
  SponsorPipelineStage,
  SponsorTier,
  type RecognitionItem,
  type Sponsor,
} from '@tms/types';
import { createEndpoints, formatMoney, formatShortDate } from '@/lib/api/endpoints';
import { PageIntro } from '@/components/AppPage';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import styles from './sponsors.module.css';

interface SponsorRow {
  id: string;
  name: string;
  sub?: string;
  type: string;
  tier: string;
  tierColor: string;
  committed: string;
  paid: string;
  paidTone: keyof typeof dataTableAmountStyles;
  recognition: 'ok' | 'pending';
  recognitionLabel: string;
  renews: string;
  action: { label: string; variant: 'glass' | 'primary' };
}

const FALLBACK_SPONSORS: SponsorRow[] = [
  {
    id: '1',
    name: 'Infosys BPM Ltd.',
    sub: 'Corporate · San Jose',
    type: 'Event + Live Stream',
    tier: 'Platinum',
    tierColor: '#e5c100',
    committed: '$25,000',
    paid: '$25,000',
    paidTone: 'green',
    recognition: 'ok',
    recognitionLabel: 'All done',
    renews: 'Dec 2026',
    action: { label: 'View', variant: 'glass' },
  },
  {
    id: '2',
    name: 'Krishnamurthy Family',
    type: 'Brahmotsavam Ubayam',
    tier: 'Gold',
    tierColor: 'var(--amber)',
    committed: '$10,000',
    paid: '$7,500',
    paidTone: 'green',
    recognition: 'pending',
    recognitionLabel: 'PA pending',
    renews: 'Annual',
    action: { label: 'View', variant: 'glass' },
  },
  {
    id: '3',
    name: 'Bay Area Telugu Assoc.',
    type: 'Festival Prasadam',
    tier: 'Gold',
    tierColor: 'var(--amber)',
    committed: '$8,000',
    paid: '$8,000',
    paidTone: 'green',
    recognition: 'ok',
    recognitionLabel: 'All done',
    renews: 'Mar 2027',
    action: { label: 'View', variant: 'glass' },
  },
  {
    id: '4',
    name: 'Patel Enterprises',
    type: 'Hall Naming Sponsor',
    tier: 'Gold',
    tierColor: 'var(--amber)',
    committed: '$5,000',
    paid: '$2,500',
    paidTone: 'amber',
    recognition: 'pending',
    recognitionLabel: 'Certificate due',
    renews: 'Dec 2026',
    action: { label: 'Follow up', variant: 'primary' },
  },
];

const TIERS = [
  { name: 'Platinum', emoji: '🏆', color: '#e5c100', count: 4, raised: '$72,000', target: '$92k target', percent: 78, barColor: 'platinum' as const },
  { name: 'Gold', emoji: '🥇', color: 'var(--amber)', count: 11, raised: '$55,000', target: '/ $92k', percent: 60, barColor: 'amber' as const },
  { name: 'Silver', emoji: '🥈', color: '#9ba3b5', count: 16, raised: '$32,000', target: '', percent: 42, barColor: 'silver' as const },
  { name: 'Community', emoji: '🤝', color: 'var(--bl)', count: 11, raised: '$25,000', target: '', percent: 28, barColor: 'blue' as const },
];

const TIER_COLORS: Record<SponsorTier, string> = {
  [SponsorTier.PLATINUM]: '#e5c100',
  [SponsorTier.GOLD]: 'var(--amber)',
  [SponsorTier.SILVER]: '#9ba3b5',
  [SponsorTier.BRONZE]: '#cd7f32',
  [SponsorTier.UBAYAM]: 'var(--gr)',
};

const PIPELINE_LABELS: Record<SponsorPipelineStage, string> = {
  [SponsorPipelineStage.LEAD]: 'Lead',
  [SponsorPipelineStage.APPROACHED]: 'Approached',
  [SponsorPipelineStage.PROPOSAL_SENT]: 'Proposal sent',
  [SponsorPipelineStage.NEGOTIATING]: 'Negotiating',
  [SponsorPipelineStage.COMMITTED]: 'Committed',
  [SponsorPipelineStage.ACTIVE]: 'Active',
  [SponsorPipelineStage.COMPLETED]: 'Completed',
  [SponsorPipelineStage.RENEWED]: 'Renewed',
};

function mapSponsor(s: Sponsor): SponsorRow {
  const paidRatio = s.committedAmount > 0 ? s.paidAmount / s.committedAmount : 1;
  const recognitionPending = paidRatio < 1;

  return {
    id: s.id,
    name: s.name,
    sub: s.type === 'corporate' ? `Corporate · ${s.primaryContact}` : undefined,
    type: s.type,
    tier: s.tier.charAt(0).toUpperCase() + s.tier.slice(1),
    tierColor: TIER_COLORS[s.tier] ?? 'var(--amber)',
    committed: formatMoney(s.committedAmount, s.currency),
    paid: formatMoney(s.paidAmount, s.currency),
    paidTone: paidRatio >= 1 ? 'green' : paidRatio >= 0.5 ? 'green' : 'amber',
    recognition: recognitionPending ? 'pending' : 'ok',
    recognitionLabel: recognitionPending ? 'Follow-up due' : 'All done',
    renews: s.renewsAt ? formatShortDate(s.renewsAt) : 'Annual',
    action: recognitionPending
      ? { label: 'Follow up', variant: 'primary' }
      : { label: 'View', variant: 'glass' },
  };
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

export default function AdminSponsorsPage() {
  const { api } = useTenant();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formOk, setFormOk] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'corporate' as Sponsor['type'],
    tier: SponsorTier.GOLD,
    primaryContact: '',
    committedAmount: 5000,
    currency: Currency.USD,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    primaryContact: '',
    email: '',
    phone: '',
    committedAmount: 0,
    paidAmount: 0,
    pipelineStage: SponsorPipelineStage.LEAD,
    relationshipManager: '',
  });

  const { data, loading, error, refetch } = useApi((ep) => ep.getSponsors({ limit: 50 }));
  const { data: renewalsData } = useApi((ep) => ep.getSponsorsRenewalsDue());
  const selectedIdForApi = selectedId && data?.data.some((s) => s.id === selectedId) ? selectedId : null;
  const { data: recognitionData, refetch: refetchRecognition } = useApi(
    async (ep) => {
      if (!selectedIdForApi) return { data: [] as RecognitionItem[] };
      return ep.getSponsorRecognition(selectedIdForApi);
    },
    [selectedIdForApi],
  );

  const liveSponsors = data?.data.length && !error ? data.data : null;
  const selectedSponsor = liveSponsors?.find((s) => s.id === selectedId) ?? liveSponsors?.[0] ?? null;

  useEffect(() => {
    if (liveSponsors?.length && !selectedId) {
      setSelectedId(liveSponsors[0].id);
    }
  }, [liveSponsors, selectedId]);

  useEffect(() => {
    if (selectedSponsor) {
      setEditForm({
        name: selectedSponsor.name,
        primaryContact: selectedSponsor.primaryContact,
        email: selectedSponsor.email ?? '',
        phone: selectedSponsor.phone ?? '',
        committedAmount: selectedSponsor.committedAmount,
        paidAmount: selectedSponsor.paidAmount,
        pipelineStage: selectedSponsor.pipelineStage,
        relationshipManager: selectedSponsor.relationshipManager ?? '',
      });
    }
  }, [selectedSponsor]);

  async function handleCreate() {
    setSaving(true);
    setFormMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.createSponsor(form);
      setShowForm(false);
      setFormOk(true);
      setFormMsg(`Sponsor "${form.name}" created.`);
      refetch();
    } catch (err) {
      setFormOk(false);
      setFormMsg(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!selectedSponsor) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.updateSponsor(selectedSponsor.id, editForm);
      setEditing(false);
      setEditMsg('Sponsor updated.');
      refetch();
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditSaving(false);
    }
  }

  async function handlePipelineChange(stage: SponsorPipelineStage) {
    if (!selectedSponsor) return;
    setEditForm((f) => ({ ...f, pipelineStage: stage }));
    try {
      const ep = createEndpoints(api);
      await ep.updateSponsor(selectedSponsor.id, { pipelineStage: stage });
      refetch();
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : 'Stage update failed');
    }
  }

  async function toggleRecognition(item: RecognitionItem) {
    if (!selectedSponsor) return;
    try {
      const ep = createEndpoints(api);
      await ep.updateSponsorRecognition(selectedSponsor.id, item.id, !item.isFulfilled);
      refetchRecognition();
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : 'Recognition update failed');
    }
  }

  const sponsors: SponsorRow[] = liveSponsors ? liveSponsors.map(mapSponsor) : FALLBACK_SPONSORS;
  const renewals = renewalsData?.data ?? [];
  const recognition = recognitionData?.data ?? [];

  const activeCount = data?.meta.total ?? 42;
  const totalCommitted = liveSponsors?.reduce((sum, s) => sum + s.committedAmount, 0);

  const paidPercent = useMemo(() => {
    if (!selectedSponsor || selectedSponsor.committedAmount <= 0) return 0;
    return Math.round((selectedSponsor.paidAmount / selectedSponsor.committedAmount) * 100);
  }, [selectedSponsor]);

  return (
    <div className="pageShell">
      <PageIntro
        subtitle="Ubayam, event sponsors, corporate partners — CRM for sponsors"
        actions={
          <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ Add Sponsor'}
          </Button>
        }
        showTenantContext={false}
      />

      {formMsg && (
        <p className="tms-t2 mb2" style={{ color: formOk ? 'var(--gr)' : 'var(--red)' }}>
          {formMsg}
        </p>
      )}

      {showForm && (
        <GlassCard title="New sponsor" className="mb2">
          <div className="formGrid">
            <div className="formGroup">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="formGroup">
              <label>Primary contact</label>
              <input value={form.primaryContact} onChange={(e) => setForm({ ...form, primaryContact: e.target.value })} />
            </div>
            <div className="formGroup">
              <label>Committed amount</label>
              <input type="number" value={form.committedAmount} onChange={(e) => setForm({ ...form, committedAmount: Number(e.target.value) })} />
            </div>
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Create sponsor'}</Button>
            </div>
          </div>
        </GlassCard>
      )}

      <ApiBanner loading={loading} error={error} />

      <BentoGrid className="mb2">
        <BentoItem span={3}>
          <StatTile icon="🤝" label="Active Sponsors" value={String(activeCount)} change="↑ 5 new" changeTone="up" accent="amber" />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile
            icon="💰"
            label="Total Committed"
            value={totalCommitted ? formatMoney(totalCommitted) : '$184k'}
            change="FY 2026"
            changeTone="neutral"
            accent="green"
          />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile icon="🔄" label="Pipeline" value="$58k" change="8 in negotiation" changeTone="neutral" accent="blue" />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile
            icon="🔔"
            label="Renewals Due"
            value={String(renewals.length || 6)}
            change="Next 90 days"
            changeTone="down"
            accent="red"
          />
        </BentoItem>
      </BentoGrid>

      <BentoGrid className="mb2">
        <BentoItem span={4}>
          <GlassCard title="Sponsor Tiers">
            <div className={styles.tierList}>
              {TIERS.map((tier) => (
                <div key={tier.name}>
                  <div className="flexBetween mb1">
                    <strong style={{ color: tier.color }}>
                      {tier.emoji} {tier.name}
                    </strong>
                    <Chip>{tier.count} sponsors</Chip>
                  </div>
                  <ProgressBar value={tier.percent} color={tier.barColor} />
                  <span className="tms-t2">
                    {tier.raised} {tier.target}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </BentoItem>
        <BentoItem span={8}>
          <GlassCard
            title="Sponsor Directory"
            headerRight={
              <div className={styles.searchPill}>
                <span className="tms-t3">⌕</span>
                <input placeholder="Search…" aria-label="Search sponsors" />
              </div>
            }
            noBodyPadding
          >
            <DataTable
              columns={[
                {
                  key: 'sponsor',
                  header: 'Sponsor',
                  render: (r) => (
                    <>
                      <strong>{r.name}</strong>
                      {r.sub !== undefined && (
                        <>
                          <br />
                          <span className="tms-t3">{r.sub}</span>
                        </>
                      )}
                    </>
                  ),
                },
                { key: 'type', header: 'Type', render: (r) => r.type },
                {
                  key: 'tier',
                  header: 'Tier',
                  render: (r) => (
                    <span style={{ color: r.tierColor, fontWeight: 700 }}>{r.tier}</span>
                  ),
                },
                {
                  key: 'committed',
                  header: 'Committed',
                  render: (r) => <span className={dataTableAmountStyles.green}>{r.committed}</span>,
                },
                {
                  key: 'paid',
                  header: 'Paid',
                  render: (r) => <span className={dataTableAmountStyles[r.paidTone]}>{r.paid}</span>,
                },
                {
                  key: 'recognition',
                  header: 'Recognition',
                  render: (r) => <Badge variant={r.recognition}>{r.recognitionLabel}</Badge>,
                },
                { key: 'renews', header: 'Renews', render: (r) => r.renews },
                {
                  key: 'action',
                  header: '',
                  render: (r) => (
                    <Button
                      size="sm"
                      variant={r.action.variant}
                      onClick={() => setSelectedId(r.id)}
                    >
                      {r.action.label}
                    </Button>
                  ),
                },
              ]}
              data={sponsors}
              getRowKey={(r) => r.id}
            />
          </GlassCard>
        </BentoItem>
      </BentoGrid>

      {renewals.length > 0 && (
        <GlassCard title="Renewals due (next 90 days)" className="mb2">
          <div className={styles.renewalList}>
            {renewals.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.renewalItem}
                onClick={() => setSelectedId(s.id)}
              >
                <strong>{s.name}</strong>
                <span className="tms-t3">
                  {s.renewsAt ? formatShortDate(s.renewsAt) : '—'} · {formatMoney(s.committedAmount, s.currency)}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard
        title={`Sponsor Profile — ${selectedSponsor?.name ?? 'Krishnamurthy Family'}`}
        headerRight={
          <div className="flexRow">
            {selectedSponsor && (
              <select
                className={styles.select}
                value={selectedSponsor.pipelineStage}
                onChange={(e) => handlePipelineChange(e.target.value as SponsorPipelineStage)}
                aria-label="Pipeline stage"
              >
                {Object.values(SponsorPipelineStage).map((stage) => (
                  <option key={stage} value={stage}>
                    {PIPELINE_LABELS[stage]}
                  </option>
                ))}
              </select>
            )}
            <span style={{ color: 'var(--amber)', fontWeight: 700 }}>
              {selectedSponsor ? `${selectedSponsor.tier.charAt(0).toUpperCase()}${selectedSponsor.tier.slice(1)}` : '🥇 Gold'}
            </span>
            <Button variant="primary" size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Cancel edit' : 'Edit'}
            </Button>
          </div>
        }
      >
        {editMsg && (
          <p className="tms-t2 mb1" style={{ color: 'var(--amber)' }}>{editMsg}</p>
        )}
        <div className={styles.profileGrid}>
          <div>
            <div className="sectionLabel">Contact</div>
            {editing && selectedSponsor ? (
              <div className="formGrid">
                <div className="formGroup">
                  <label>Name</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="formGroup">
                  <label>Primary contact</label>
                  <input value={editForm.primaryContact} onChange={(e) => setEditForm({ ...editForm, primaryContact: e.target.value })} />
                </div>
                <div className="formGroup">
                  <label>Email</label>
                  <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="formGroup">
                  <label>Phone</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="formGroup">
                  <label>Relationship manager</label>
                  <input value={editForm.relationshipManager} onChange={(e) => setEditForm({ ...editForm, relationshipManager: e.target.value })} />
                </div>
              </div>
            ) : (
              <>
                <p className="tms-t2">{selectedSponsor?.primaryContact ?? 'Rajan Krishnamurthy'}</p>
                <p className="tms-t2">
                  {selectedSponsor?.email ?? 'rajan@example.com'}
                  {selectedSponsor?.phone ? ` · ${selectedSponsor.phone}` : ' · +1 510 555 0191'}
                </p>
                <p className="tms-t2 mt1">
                  Relationship: <strong>{selectedSponsor?.relationshipManager ?? 'Smt. Kamala'}</strong>
                </p>
              </>
            )}
          </div>
          <div>
            <div className="sectionLabel">Commitment</div>
            {editing && selectedSponsor ? (
              <div className="formGrid">
                <div className="formGroup">
                  <label>Committed amount</label>
                  <input
                    type="number"
                    value={editForm.committedAmount}
                    onChange={(e) => setEditForm({ ...editForm, committedAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="formGroup">
                  <label>Paid amount</label>
                  <input
                    type="number"
                    value={editForm.paidAmount}
                    onChange={(e) => setEditForm({ ...editForm, paidAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                  <Button onClick={handleSaveEdit} disabled={editSaving}>
                    {editSaving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="tms-t2">
                  {selectedSponsor
                    ? `${formatMoney(selectedSponsor.committedAmount, selectedSponsor.currency)} · ${selectedSponsor.type}`
                    : '$10,000 · Brahmotsavam 2026'}
                </p>
                <ProgressBar value={paidPercent || 75} color="amber" />
                <p className="tms-t2">
                  {selectedSponsor
                    ? `${formatMoney(selectedSponsor.paidAmount, selectedSponsor.currency)} paid`
                    : '$7,500 paid · $2,500 due Jul 1'}
                </p>
              </>
            )}
          </div>
          <div>
            <div className="sectionLabel">Recognition Status</div>
            {recognition.length > 0 ? (
              recognition.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.recognitionRow}
                  onClick={() => toggleRecognition(item)}
                  title="Click to toggle"
                >
                  <span className={item.isFulfilled ? styles.statusDone : styles.statusPartial}>
                    {item.isFulfilled ? '✓' : '○'}
                  </span>
                  <span className="tms-t2">{item.item}</span>
                </button>
              ))
            ) : (
              <>
                <div className="flexRow mb1">
                  <span className={styles.statusDone}>✓</span>
                  <span className="tms-t2">PA announcement done</span>
                </div>
                <div className="flexRow mb1">
                  <span className={styles.statusDone}>✓</span>
                  <span className="tms-t2">Certificate sent</span>
                </div>
                <div className="flexRow mb1">
                  <span className={styles.statusDone}>✓</span>
                  <span className="tms-t2">Website listing live</span>
                </div>
                <div className="flexRow">
                  <span className={styles.statusPartial}>◐</span>
                  <span className="tms-t2">Event banner placement</span>
                </div>
              </>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
