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
  StatTile,
} from '@tms/ui';
import { PrasadamPackageTier, PrasadamSponsorshipType, type PrasadamSponsorship } from '@tms/types';
import { formatMoney, formatShortDate } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import styles from './prasadam.module.css';

interface SponsorshipRow {
  id: string;
  date: string;
  type: string;
  sponsor: string;
  occasion: string;
  pkg: string;
  receipt: 'ok';
  receiptLabel: string;
  kitchen: 'ok' | 'pending';
  kitchenLabel: string;
  courier: string;
}

const FALLBACK_RECENT: SponsorshipRow[] = [
  {
    id: '1',
    date: 'Jun 6',
    type: 'Daily Prasadam',
    sponsor: 'Rajan K.',
    occasion: 'Birthday',
    pkg: 'Gold $151',
    receipt: 'ok',
    receiptLabel: 'IRS Sent',
    kitchen: 'ok',
    kitchenLabel: 'Prepared',
    courier: '—',
  },
  {
    id: '2',
    date: 'Jun 5',
    type: 'Annadanam',
    sponsor: 'Sharma Family',
    occasion: 'Anniversary',
    pkg: 'Platinum $501',
    receipt: 'ok',
    receiptLabel: 'IRS Sent',
    kitchen: 'pending',
    kitchenLabel: 'Pending',
    courier: '—',
  },
  {
    id: '3',
    date: 'Jun 4',
    type: 'Festival Kit (NRI)',
    sponsor: 'Meena Patel (CA)',
    occasion: 'Thanksgiving',
    pkg: 'NRI $201',
    receipt: 'ok',
    receiptLabel: 'CRA Sent',
    kitchen: 'ok',
    kitchenLabel: 'Packed',
    courier: 'Dispatched',
  },
];

const TYPE_LABELS: Record<PrasadamSponsorshipType, string> = {
  [PrasadamSponsorshipType.DAILY]: 'Daily Prasadam',
  [PrasadamSponsorshipType.FESTIVAL]: 'Festival Kit',
  [PrasadamSponsorshipType.ABHISHEKAM]: 'Abhishekam Prasadam',
  [PrasadamSponsorshipType.ANNADANAM]: 'Annadanam',
  [PrasadamSponsorshipType.KIT]: 'Festival Kit',
  [PrasadamSponsorshipType.RECURRING]: 'Recurring',
  [PrasadamSponsorshipType.NRI]: 'Festival Kit (NRI)',
};

const PACKAGE_LABELS: Record<PrasadamPackageTier, string> = {
  [PrasadamPackageTier.BASIC]: 'Basic',
  [PrasadamPackageTier.SILVER]: 'Silver',
  [PrasadamPackageTier.GOLD]: 'Gold',
  [PrasadamPackageTier.PLATINUM]: 'Platinum',
  [PrasadamPackageTier.NRI_COURIER]: 'NRI',
};

const CAL_DAYS = [
  { key: 'e1', empty: true },
  { key: 'e2', empty: true },
  { key: '3', sponsored: true },
  { key: '4', sponsored: true },
  { key: '5', label: '4' },
  { key: '6', label: '5', avail: true, today: true },
  { key: '7', label: '6', auspicious: true, event: true, sub: 'Ekadashi' },
  { key: '8', label: '7' },
  { key: '9', sponsored: true },
  { key: '10', label: '9' },
  { key: '11', label: '10' },
  { key: '12', label: '11' },
  { key: '13', label: '12', auspicious: true, sub: 'Rohini' },
  { key: '14', label: '13' },
  { key: '15', label: '14' },
  { key: '16', label: '15' },
  { key: '17', label: '16' },
  { key: '18', label: '17' },
  { key: '19', auspicious: true },
  { key: '20', label: '19' },
  { key: '21', label: '20' },
];

function mapSponsorship(s: PrasadamSponsorship): SponsorshipRow {
  const kitchenPending = s.status === 'kitchen_pending' || s.status === 'booked';
  const kitchenOk = s.status === 'prepared' || s.status === 'distributed' || s.status === 'dispatched';

  return {
    id: s.id,
    date: formatShortDate(s.scheduledDate),
    type: TYPE_LABELS[s.type] ?? s.type,
    sponsor: s.sankalpa.sponsorName,
    occasion: s.sankalpa.occasion ?? '—',
    pkg: `${PACKAGE_LABELS[s.packageTier] ?? s.packageTier} ${formatMoney(s.amount, s.currency)}`,
    receipt: 'ok',
    receiptLabel: s.receiptNumber ? 'IRS Sent' : 'Pending',
    kitchen: kitchenPending ? 'pending' : 'ok',
    kitchenLabel: kitchenOk ? (s.status === 'dispatched' ? 'Packed' : 'Prepared') : 'Pending',
    courier: s.courierTrackingId ? 'Dispatched' : '—',
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

export default function AdminPrasadamPage() {
  const { data, loading, error } = useApi((ep) => ep.getPrasadamSponsorships({ limit: 20 }));

  const recent: SponsorshipRow[] =
    data?.data.length && !error ? data.data.map(mapSponsorship) : FALLBACK_RECENT;

  const mtdCount = data?.meta.total ?? 84;
  const mtdRevenue = data?.data.reduce((sum, s) => sum + s.amount, 0);
  const nriCount = data?.data.filter((s) => s.type === PrasadamSponsorshipType.NRI).length ?? 38;
  const courierCount = data?.data.filter((s) => s.courierTrackingId).length ?? 12;

  return (
    <>
      <PageHeader
        title="Prasadam Sponsorship Program"
        subtitle="Sponsor deity prasadam, annadanam, festival kits — online & NRI"
        actions={
          <div className="flexRow">
            <Button variant="primary">+ New Sponsorship</Button>
            <Button size="sm">Kitchen Orders</Button>
          </div>
        }
      />

      <ApiBanner loading={loading} error={error} />

      <BentoGrid className="mb2">
        <BentoItem span={3}>
          <StatTile icon="🍬" label="Sponsorships MTD" value={String(mtdCount)} change="↑ 12 this week" changeTone="up" accent="amber" />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile
            icon="💰"
            label="Revenue MTD"
            value={mtdRevenue ? formatMoney(mtdRevenue) : '$12,400'}
            change="↑ 24%"
            changeTone="up"
            accent="green"
          />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile icon="🌏" label="NRI / Online" value={String(nriCount)} change="45% of total" changeTone="neutral" accent="blue" />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile icon="📦" label="Courier Dispatches" value={String(courierCount)} change="Pending today" changeTone="neutral" accent="red" />
        </BentoItem>
      </BentoGrid>

      <BentoGrid className="mb2">
        <BentoItem span={5}>
          <GlassCard
            title="📅 Availability Calendar — July 2026"
            headerRight={
              <select className={styles.select} defaultValue="daily" aria-label="Prasadam type">
                <option value="daily">Daily Prasadam — Lord Venkateswara</option>
                <option value="abhishekam">Abhishekam Prasadam</option>
                <option value="festival">Festival Kit</option>
                <option value="annadanam">Annadanam (Free Meals)</option>
              </select>
            }
          >
            <div className={styles.cal}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className={styles.calHead}>
                  {d}
                </div>
              ))}
              {CAL_DAYS.map((day) => {
                if (day.empty) {
                  return <div key={day.key} className={[styles.calDay, styles.calEmpty].join(' ')} />;
                }
                if (day.sponsored) {
                  return (
                    <div key={day.key} className={[styles.calDay, styles.calSponsored].join(' ')}>
                      ✓
                      <small>Taken</small>
                    </div>
                  );
                }
                return (
                  <div
                    key={day.key}
                    className={[
                      styles.calDay,
                      day.today ? styles.calToday : '',
                      day.auspicious ? styles.calAuspicious : '',
                      day.event ? styles.calEvent : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {day.label}
                    {day.avail && <small>AVAIL</small>}
                    {day.sub !== undefined && <small className={styles.calSub}>{day.sub}</small>}
                  </div>
                );
              })}
            </div>
            <div className={styles.calLegend}>
              <span className="flexRow">
                <span className={styles.legendSponsored} /> Sponsored
              </span>
              <span className="flexRow">
                <span className={styles.legendAuspicious} /> Auspicious
              </span>
              <span className="flexRow">
                <span className={styles.legendAvailable} /> Available
              </span>
            </div>
            <Button variant="primary" fullWidth className="mt2">
              Book Jul 5 — Daily Prasadam
            </Button>
          </GlassCard>
        </BentoItem>
        <BentoItem span={7}>
          <GlassCard
            title="New Prasadam Sponsorship — Jul 5"
            headerRight={<Chip>Daily Prasadam</Chip>}
          >
            <div className="formGrid">
              <div className="formGroup">
                <label>Sponsor Name</label>
                <input defaultValue="Rajan Krishnamurthy" readOnly />
              </div>
              <div className="formGroup">
                <label>Package</label>
                <select defaultValue="gold">
                  <option value="gold">Gold — $151 (PA mention + certificate + kit)</option>
                  <option value="silver">Silver — $101</option>
                  <option value="basic">Basic — $51</option>
                  <option value="nri">NRI Courier — $201</option>
                </select>
              </div>
            </div>
            <div className="formGrid">
              <div className="formGroup">
                <label>Gotram</label>
                <input defaultValue="Bharadwaja" readOnly />
              </div>
              <div className="formGroup">
                <label>Nakshatra</label>
                <input defaultValue="Rohini" readOnly />
              </div>
            </div>
            <div className="formGroup">
              <label>Occasion</label>
              <select defaultValue="birthday">
                <option value="birthday">Birthday</option>
                <option value="anniversary">Wedding Anniversary</option>
                <option value="memorial">Memorial / Shraddha</option>
                <option value="thanks">Thanksgiving</option>
                <option value="venture">New Venture</option>
              </select>
            </div>
            <div className="formGroup">
              <label>Beneficiary Name (Sankalpa)</label>
              <input defaultValue="Smt. Kamala Krishnamurthy (Mom's birthday)" readOnly />
            </div>
            <div className="calloutAmber mb2">
              📋 <strong>Gold Package includes:</strong> Priest reads sankalpa during morning puja · PA
              announcement · Digital notice board display · Personalised certificate (PDF) · Prasadam
              kit with Laddu & Pulihora · 501(c)(3) tax receipt (USA) · WhatsApp + email confirmation
              within 15 min
            </div>
            <Button variant="primary" size="lg" fullWidth>
              Pay $151 · Confirm Sponsorship
            </Button>
          </GlassCard>
        </BentoItem>
      </BentoGrid>

      <GlassCard title="Recent Sponsorships" headerRight={<Button size="sm">Export</Button>} noBodyPadding>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', render: (r) => r.date },
            { key: 'type', header: 'Type', render: (r) => r.type },
            { key: 'sponsor', header: 'Sponsor', render: (r) => r.sponsor },
            { key: 'occasion', header: 'Occasion', render: (r) => r.occasion },
            { key: 'pkg', header: 'Package', render: (r) => <Chip>{r.pkg}</Chip> },
            {
              key: 'receipt',
              header: 'Receipt',
              render: (r) => <Badge variant={r.receipt}>{r.receiptLabel}</Badge>,
            },
            {
              key: 'kitchen',
              header: 'Kitchen',
              render: (r) => <Badge variant={r.kitchen}>{r.kitchenLabel}</Badge>,
            },
            {
              key: 'courier',
              header: 'Courier',
              render: (r) => (r.courier === '—' ? '—' : <Badge variant="pending">{r.courier}</Badge>),
            },
          ]}
          data={recent}
          getRowKey={(r) => r.id}
        />
      </GlassCard>
    </>
  );
}
