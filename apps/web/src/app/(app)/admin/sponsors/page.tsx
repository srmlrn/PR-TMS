'use client';

import {
  Badge,
  BentoGrid,
  BentoItem,
  Button,
  Chip,
  DataTable,
  GlassCard,
  PageHeader,
  ProgressBar,
  StatTile,
  dataTableAmountStyles,
} from '@tms/ui';
import { SponsorTier, type Sponsor } from '@tms/types';
import { formatMoney, formatShortDate } from '@/lib/api/endpoints';
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
    <div className={styles.apiBanner}>
      {loading && 'Loading live data…'}
      {!loading && error && `Using demo data — ${error}`}
    </div>
  );
}

export default function AdminSponsorsPage() {
  const { data, loading, error } = useApi((ep) => ep.getSponsors({ limit: 50 }));

  const sponsors: SponsorRow[] =
    data?.data.length && !error ? data.data.map(mapSponsor) : FALLBACK_SPONSORS;

  const activeCount = data?.meta.total ?? 42;
  const totalCommitted = data?.data.reduce((sum, s) => sum + s.committedAmount, 0);

  return (
    <>
      <PageHeader
        title="Sponsor Management"
        subtitle="Ubayam, event sponsors, corporate partners — CRM for sponsors"
        actions={<Button variant="primary">+ Add Sponsor</Button>}
      />

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
          <StatTile icon="🔔" label="Renewals Due" value="6" change="Next 60 days" changeTone="down" accent="red" />
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
                    <Button size="sm" variant={r.action.variant}>
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

      <GlassCard
        title="Sponsor Profile — Krishnamurthy Family"
        headerRight={
          <div className="flexRow">
            <span style={{ color: 'var(--amber)', fontWeight: 700 }}>🥇 Gold</span>
            <Button variant="primary" size="sm">
              Renew / Upgrade
            </Button>
          </div>
        }
      >
        <div className={styles.profileGrid}>
          <div>
            <div className="sectionLabel">Contact</div>
            <p className="tms-t2">Rajan Krishnamurthy</p>
            <p className="tms-t2">rajan@example.com · +1 510 555 0191</p>
            <p className="tms-t2 mt1">
              Relationship: <strong>Smt. Kamala</strong>
            </p>
          </div>
          <div>
            <div className="sectionLabel">Commitment</div>
            <p className="tms-t2">$10,000 · Brahmotsavam 2026</p>
            <ProgressBar value={75} color="amber" />
            <p className="tms-t2">$7,500 paid · $2,500 due Jul 1</p>
          </div>
          <div>
            <div className="sectionLabel">Recognition Status</div>
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
          </div>
        </div>
      </GlassCard>
    </>
  );
}
