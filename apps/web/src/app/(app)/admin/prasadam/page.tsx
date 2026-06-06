'use client';

import { useCallback, useMemo, useState } from 'react';
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
import {
  Currency,
  PrasadamPackageTier,
  PrasadamSponsorshipType,
  type PaymentProvider,
  type PrasadamSponsorship,
} from '@tms/types';
import { createEndpoints, formatMoney, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useTenantSite } from '@/lib/tenant-site';
import { useApi } from '@/lib/api/use-api';
import { PaymentProviderPicker } from '@/components/PaymentProviderPicker';
import { useLivePaymentGate } from '@/hooks/use-live-payment-gate';
import { checkoutAndPay, defaultPaymentProvider } from '@/lib/payment-flow';
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

const PACKAGE_AMOUNTS: Record<PrasadamPackageTier, number> = {
  [PrasadamPackageTier.BASIC]: 51,
  [PrasadamPackageTier.SILVER]: 101,
  [PrasadamPackageTier.GOLD]: 151,
  [PrasadamPackageTier.PLATINUM]: 251,
  [PrasadamPackageTier.NRI_COURIER]: 201,
};

const PACKAGE_OPTIONS: { tier: PrasadamPackageTier; label: string }[] = [
  { tier: PrasadamPackageTier.GOLD, label: 'Gold — $151 (PA mention + certificate + kit)' },
  { tier: PrasadamPackageTier.SILVER, label: 'Silver — $101' },
  { tier: PrasadamPackageTier.BASIC, label: 'Basic — $51' },
  { tier: PrasadamPackageTier.PLATINUM, label: 'Platinum — $251' },
  { tier: PrasadamPackageTier.NRI_COURIER, label: 'NRI Courier — $201' },
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

function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

export default function AdminPrasadamPage() {
  const { api } = useTenant();
  const site = useTenantSite();
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayKey = today.toISOString().slice(0, 10);

  const [calendarMonth, setCalendarMonth] = useState(defaultMonth);
  const [prasadamType, setPrasadamType] = useState(PrasadamSponsorshipType.DAILY);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formOk, setFormOk] = useState(false);
  const [kitchenOrderId, setKitchenOrderId] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(() =>
    defaultPaymentProvider(Currency.USD, 'counter'),
  );
  const [bookForm, setBookForm] = useState({
    devoteeId: 'dev-rajan-krishnamurthy',
    deity: site.deity,
    sponsorName: 'Rajan Krishnamurthy',
    gotram: 'Bharadwaja',
    nakshatra: 'Rohini',
    occasion: 'birthday',
    beneficiaryName: "Smt. Kamala Krishnamurthy (Mom's birthday)",
    packageTier: PrasadamPackageTier.GOLD,
    courierAddress: '',
  });

  const getPayer = useCallback(
    () => ({ name: bookForm.sponsorName }),
    [bookForm.sponsorName],
  );
  const { gate, livePaymentModal } = useLivePaymentGate(getPayer);

  const { data, loading, error, refetch } = useApi((ep) => ep.getPrasadamSponsorships({ limit: 20 }));
  const { data: availabilityData, loading: calLoading } = useApi(
    (ep) =>
      ep.getPrasadamAvailability({
        month: calendarMonth,
        type: prasadamType,
        deity: site.deity,
      }),
    [calendarMonth, prasadamType, site.deity],
  );

  const slots = availabilityData?.data ?? [];
  const slotMap = useMemo(() => new Map(slots.map((s) => [s.date, s])), [slots]);

  const calendarCells = useMemo(() => {
    const [year, monthNum] = calendarMonth.split('-').map(Number);
    const firstDay = new Date(year, monthNum - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const cells: Array<
      | { key: string; empty: true }
      | { key: string; date: string; day: number; available: boolean; sponsored: boolean; today: boolean }
    > = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ key: `empty-${i}`, empty: true });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const slot = slotMap.get(date);
      cells.push({
        key: date,
        date,
        day,
        available: slot?.isAvailable ?? true,
        sponsored: slot ? !slot.isAvailable : false,
        today: date === todayKey,
      });
    }
    return cells;
  }, [calendarMonth, slotMap, todayKey]);

  const bookingDate = selectedDate ?? slots.find((s) => s.isAvailable)?.date ?? todayKey;
  const packageAmount = PACKAGE_AMOUNTS[bookForm.packageTier];

  async function handleBookAndPay() {
    setSaving(true);
    setFormMsg(null);
    setKitchenOrderId(null);
    try {
      const ep = createEndpoints(api);
      await checkoutAndPay(
        ep,
        {
          amount: packageAmount,
          currency: Currency.USD,
          purpose: `Prasadam sponsorship — ${TYPE_LABELS[prasadamType]} — ${bookingDate}`,
          devoteeId: bookForm.devoteeId,
          provider: paymentProvider,
        },
        gate,
      );

      const created = await ep.createPrasadamSponsorship({
        type: prasadamType,
        packageTier: bookForm.packageTier,
        devoteeId: bookForm.devoteeId,
        scheduledDate: bookingDate,
        deity: bookForm.deity,
        sankalpa: {
          sponsorName: bookForm.sponsorName,
          gotram: bookForm.gotram || undefined,
          nakshatra: bookForm.nakshatra || undefined,
          occasion: bookForm.occasion,
          beneficiaryName: bookForm.beneficiaryName || undefined,
        },
        courierAddress: bookForm.courierAddress || undefined,
        currency: Currency.USD,
      });

      setFormOk(true);
      setFormMsg(`Prasadam sponsorship confirmed for ${bookForm.sponsorName}.`);
      if (created.kitchenOrderId) {
        setKitchenOrderId(created.kitchenOrderId);
      }
      refetch();
    } catch (err) {
      setFormOk(false);
      setFormMsg(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSaving(false);
    }
  }

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
            <Button size="sm">Kitchen Orders</Button>
          </div>
        }
      />

      <ApiBanner loading={loading} error={error} />

      {formMsg && (
        <p className="tms-t2 mb2" style={{ color: formOk ? 'var(--gr)' : 'var(--red)' }}>
          {formMsg}
          {kitchenOrderId && (
            <>
              {' '}
              Kitchen order: <strong>{kitchenOrderId}</strong>
            </>
          )}
        </p>
      )}

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
            title={`📅 Availability Calendar — ${monthLabel(calendarMonth)}`}
            headerRight={
              <div className="flexRow">
                <Button size="sm" onClick={() => setCalendarMonth((m) => shiftMonth(m, -1))}>‹</Button>
                <input
                  type="month"
                  className={styles.select}
                  value={calendarMonth}
                  onChange={(e) => setCalendarMonth(e.target.value)}
                  aria-label="Calendar month"
                />
                <Button size="sm" onClick={() => setCalendarMonth((m) => shiftMonth(m, 1))}>›</Button>
                <select
                  className={styles.select}
                  value={prasadamType}
                  onChange={(e) => setPrasadamType(e.target.value as PrasadamSponsorshipType)}
                  aria-label="Prasadam type"
                >
                  <option value={PrasadamSponsorshipType.DAILY}>Daily Prasadam — {site.deity}</option>
                  <option value={PrasadamSponsorshipType.ABHISHEKAM}>Abhishekam Prasadam</option>
                  <option value={PrasadamSponsorshipType.FESTIVAL}>Festival Kit</option>
                  <option value={PrasadamSponsorshipType.ANNADANAM}>Annadanam (Free Meals)</option>
                  <option value={PrasadamSponsorshipType.NRI}>NRI Courier Kit</option>
                </select>
              </div>
            }
          >
            {calLoading && <p className="tms-t3 mb1">Loading availability…</p>}
            <div className={styles.cal}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className={styles.calHead}>
                  {d}
                </div>
              ))}
              {calendarCells.map((day) => {
                if ('empty' in day && day.empty) {
                  return <div key={day.key} className={[styles.calDay, styles.calEmpty].join(' ')} />;
                }
                if ('empty' in day) return null;
                if (day.sponsored) {
                  return (
                    <div key={day.key} className={[styles.calDay, styles.calSponsored].join(' ')}>
                      {day.day}
                      <small>Taken</small>
                    </div>
                  );
                }
                return (
                  <button
                    key={day.key}
                    type="button"
                    className={[
                      styles.calDay,
                      day.today ? styles.calToday : '',
                      day.available ? styles.calAuspicious : '',
                      selectedDate === day.date ? styles.calSelected : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    {day.day}
                    {day.available && <small>AVAIL</small>}
                  </button>
                );
              })}
            </div>
            <div className={styles.calLegend}>
              <span className="flexRow">
                <span className={styles.legendSponsored} /> Sponsored
              </span>
              <span className="flexRow">
                <span className={styles.legendAuspicious} /> Available
              </span>
            </div>
            <Button
              variant="primary"
              fullWidth
              className="mt2"
              onClick={() => setSelectedDate(bookingDate)}
            >
              Book {formatShortDate(bookingDate)} — {TYPE_LABELS[prasadamType]}
            </Button>
          </GlassCard>
        </BentoItem>
        <BentoItem span={7}>
          <GlassCard
            title={`New Prasadam Sponsorship — ${formatShortDate(bookingDate)}`}
            headerRight={<Chip>{TYPE_LABELS[prasadamType]}</Chip>}
          >
            <div className="formGrid">
              <div className="formGroup">
                <label>Devotee ID</label>
                <input
                  value={bookForm.devoteeId}
                  onChange={(e) => setBookForm({ ...bookForm, devoteeId: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Sponsor Name</label>
                <input
                  value={bookForm.sponsorName}
                  onChange={(e) => setBookForm({ ...bookForm, sponsorName: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Package</label>
                <select
                  value={bookForm.packageTier}
                  onChange={(e) =>
                    setBookForm({ ...bookForm, packageTier: e.target.value as PrasadamPackageTier })
                  }
                >
                  {PACKAGE_OPTIONS.map((opt) => (
                    <option key={opt.tier} value={opt.tier}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="formGrid">
              <div className="formGroup">
                <label>Gotram</label>
                <input
                  value={bookForm.gotram}
                  onChange={(e) => setBookForm({ ...bookForm, gotram: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Nakshatra</label>
                <input
                  value={bookForm.nakshatra}
                  onChange={(e) => setBookForm({ ...bookForm, nakshatra: e.target.value })}
                />
              </div>
            </div>
            <div className="formGroup">
              <label>Occasion</label>
              <select
                value={bookForm.occasion}
                onChange={(e) => setBookForm({ ...bookForm, occasion: e.target.value })}
              >
                <option value="birthday">Birthday</option>
                <option value="anniversary">Wedding Anniversary</option>
                <option value="memorial">Memorial / Shraddha</option>
                <option value="thanks">Thanksgiving</option>
                <option value="venture">New Venture</option>
              </select>
            </div>
            <div className="formGroup">
              <label>Beneficiary Name (Sankalpa)</label>
              <input
                value={bookForm.beneficiaryName}
                onChange={(e) => setBookForm({ ...bookForm, beneficiaryName: e.target.value })}
              />
            </div>
            {bookForm.packageTier === PrasadamPackageTier.NRI_COURIER && (
              <div className="formGroup">
                <label>Courier address</label>
                <input
                  value={bookForm.courierAddress}
                  onChange={(e) => setBookForm({ ...bookForm, courierAddress: e.target.value })}
                />
              </div>
            )}
            <PaymentProviderPicker
              value={paymentProvider}
              onChange={setPaymentProvider}
              currency={Currency.USD}
              channel="counter"
            />
            <div className="calloutAmber mb2">
              📋 <strong>{PACKAGE_LABELS[bookForm.packageTier]} Package:</strong> Priest reads sankalpa during morning puja · PA
              announcement · Digital notice board · Personalised certificate · Prasadam kit · Tax receipt · Confirmation within 15 min
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={handleBookAndPay} disabled={saving}>
              {saving ? 'Processing…' : `Pay ${formatMoney(packageAmount)} · Confirm Sponsorship`}
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
      {livePaymentModal}
    </>
  );
}
