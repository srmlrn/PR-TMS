'use client';

import {
  Badge,
  BentoGrid,
  BentoItem,
  Button,
  DataTable,
  GlassCard,
  StatTile,
  dataTableAmountStyles,
} from '@tms/ui';
import { RentalStatus, type RentalAsset, type RentalOrder } from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { formatMoney, formatShortDate } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import styles from './rentals.module.css';

interface RentalOrderRow {
  id: string;
  client: string;
  assets: string;
  from: string;
  to: string;
  deposit: string;
  depositTone: keyof typeof dataTableAmountStyles | 'muted';
  balance: string;
  balanceTone: keyof typeof dataTableAmountStyles | 'muted';
  status: 'pending' | 'ok' | 'info' | 'error';
  statusLabel: string;
  action: { label: string; variant: 'glass' | 'primary' | 'crimson' };
}

const FALLBACK_ORDERS: RentalOrderRow[] = [
  {
    id: '1',
    client: 'Patel Wedding',
    assets: 'Main Hall + 200 chairs + PA',
    from: 'Sep 14',
    to: 'Sep 14',
    deposit: '$500 held',
    depositTone: 'green',
    balance: '$1,200',
    balanceTone: 'amber',
    status: 'pending',
    statusLabel: 'Upcoming',
    action: { label: 'View', variant: 'glass' },
  },
  {
    id: '2',
    client: 'Reddy Anniversary',
    assets: 'Kalyana Mand. + Projector',
    from: 'Jul 18',
    to: 'Jul 18',
    deposit: '$300 held',
    depositTone: 'green',
    balance: '$0',
    balanceTone: 'green',
    status: 'ok',
    statusLabel: 'Paid',
    action: { label: 'View', variant: 'glass' },
  },
  {
    id: '3',
    client: 'TCS Conference',
    assets: 'Conf. Room + A/V setup',
    from: 'Aug 5',
    to: 'Aug 5',
    deposit: 'Pending',
    depositTone: 'muted',
    balance: '$850',
    balanceTone: 'amber',
    status: 'info',
    statusLabel: 'Quoted',
    action: { label: 'Confirm', variant: 'primary' },
  },
  {
    id: '4',
    client: 'Community Org.',
    assets: '6x Round Tables + 48 Chairs',
    from: 'Jun 4',
    to: 'Jun 3 ⚠',
    deposit: '$150 held',
    depositTone: 'amber',
    balance: '—',
    balanceTone: 'muted',
    status: 'error',
    statusLabel: 'Overdue',
    action: { label: 'Chase', variant: 'crimson' },
  },
];

interface AssetRow {
  id: string;
  emoji: string;
  name: string;
  detail: string;
  status: 'ok' | 'pending' | 'error';
  statusLabel: string;
}

const FALLBACK_ASSETS: AssetRow[] = [
  { id: 'a1', emoji: '🎤', name: 'PA System (Full)', detail: '4 units · $200/day', status: 'ok', statusLabel: '2 Available' },
  { id: 'a2', emoji: '🪑', name: 'Banquet Chairs', detail: '500 units · $2/chair/day', status: 'ok', statusLabel: '320 Avail' },
  { id: 'a3', emoji: '📽️', name: 'Projector + Screen', detail: '3 units · $75/day', status: 'pending', statusLabel: '1 Available' },
  { id: 'a4', emoji: '🔧', name: 'Industrial Cooker', detail: '2 units · Under repair', status: 'error', statusLabel: 'Unavailable' },
  { id: 'a5', emoji: '🎪', name: 'Canopy Tent (40x40)', detail: '2 units · $150/day', status: 'ok', statusLabel: '2 Available' },
];

const ASSET_EMOJI: Record<string, string> = {
  av: '🎤',
  furniture: '🪑',
  kitchen: '🔧',
  decor: '🎪',
  tent: '🎪',
};

function toneClass(tone: keyof typeof dataTableAmountStyles | 'muted'): string {
  if (tone === 'muted') return 'tms-t3';
  return dataTableAmountStyles[tone];
}

function orderStatusMeta(status: RentalStatus): { badge: RentalOrderRow['status']; label: string; action: RentalOrderRow['action'] } {
  switch (status) {
    case RentalStatus.OVERDUE:
      return { badge: 'error', label: 'Overdue', action: { label: 'Chase', variant: 'crimson' } };
    case RentalStatus.QUOTED:
      return { badge: 'info', label: 'Quoted', action: { label: 'Confirm', variant: 'primary' } };
    case RentalStatus.CONFIRMED:
    case RentalStatus.RETURNED:
      return { badge: 'ok', label: 'Paid', action: { label: 'View', variant: 'glass' } };
    default:
      return { badge: 'pending', label: 'Upcoming', action: { label: 'View', variant: 'glass' } };
  }
}

function mapOrder(order: RentalOrder): RentalOrderRow {
  const meta = orderStatusMeta(order.status);
  const depositTone = order.depositAmount > 0 ? 'green' : 'muted';
  const balanceTone = order.balanceAmount === 0 ? 'green' : 'amber';

  return {
    id: order.id,
    client: order.clientName,
    assets: `${order.assetIds.length} asset line(s)`,
    from: formatShortDate(order.startDate),
    to: formatShortDate(order.endDate),
    deposit: order.depositAmount > 0 ? `${formatMoney(order.depositAmount, order.currency)} held` : 'Pending',
    depositTone: depositTone as RentalOrderRow['depositTone'],
    balance: order.balanceAmount > 0 ? formatMoney(order.balanceAmount, order.currency) : '$0',
    balanceTone: balanceTone as RentalOrderRow['balanceTone'],
    status: meta.badge,
    statusLabel: meta.label,
    action: meta.action,
  };
}

function mapAsset(asset: RentalAsset): AssetRow {
  const status =
    asset.status === 'under_repair'
      ? 'error'
      : asset.availableQuantity <= 1
        ? 'pending'
        : 'ok';

  return {
    id: asset.id,
    emoji: ASSET_EMOJI[asset.category] ?? '📦',
    name: asset.name,
    detail: `${asset.quantity} units · ${formatMoney(asset.ratePerDay, asset.currency)}/day`,
    status,
    statusLabel:
      asset.status === 'under_repair'
        ? 'Unavailable'
        : `${asset.availableQuantity} Available`,
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

export default function AdminRentalsPage() {
  const { data, loading, error } = useApi((ep) =>
    Promise.all([ep.getRentalOrders({ limit: 20 }), ep.getRentalAssets({ limit: 20 })]).then(
      ([orders, assets]) => ({ orders, assets }),
    ),
  );

  const orders: RentalOrderRow[] =
    data?.orders?.data.length && !error
      ? data.orders.data.map(mapOrder)
      : FALLBACK_ORDERS;

  const assets: AssetRow[] =
    data?.assets?.data.length && !error
      ? data.assets.data.map(mapAsset)
      : FALLBACK_ASSETS;

  const activeCount = data?.orders?.meta.total ?? 7;
  const overdueCount =
    data?.orders?.data.filter((o) => o.status === RentalStatus.OVERDUE).length ?? 2;
  const repairCount =
    data?.assets?.data.filter((a) => a.status === 'under_repair').length ?? 3;

  return (
    <>
      <PageIntro
        subtitle="Halls, mandapams, PA systems, furniture, kitchen gear"
        actions={<Button variant="primary">+ New Rental Order</Button>}
        showTenantContext={false}
      />

      <ApiBanner loading={loading} error={error} />

      <BentoGrid className="mb2">
        <BentoItem span={3}>
          <StatTile icon="🏛️" label="Active Rentals" value={String(activeCount)} change="3 venues · 4 equipment" changeTone="neutral" accent="amber" />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile icon="💰" label="Rental Revenue MTD" value="$8,400" change="↑ 18%" changeTone="up" accent="green" />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile icon="⚠️" label="Overdue Returns" value={String(overdueCount)} change="PA System · Chairs" changeTone="down" accent="red" />
        </BentoItem>
        <BentoItem span={3}>
          <StatTile icon="🔧" label="Under Repair" value={String(repairCount)} change="items unavailable" changeTone="neutral" accent="blue" />
        </BentoItem>
      </BentoGrid>

      <BentoGrid className="mb2">
        <BentoItem span={7}>
          <GlassCard title="Active Rental Orders" headerRight={<Button size="sm">Filter</Button>} noBodyPadding>
            <DataTable
              columns={[
                { key: 'client', header: 'Client', render: (r) => <strong>{r.client}</strong> },
                { key: 'assets', header: 'Assets', render: (r) => r.assets },
                { key: 'from', header: 'From', render: (r) => r.from },
                {
                  key: 'to',
                  header: 'To',
                  render: (r) =>
                    r.status === 'error' ? (
                      <strong style={{ color: 'var(--red)' }}>{r.to}</strong>
                    ) : (
                      r.to
                    ),
                },
                {
                  key: 'deposit',
                  header: 'Deposit',
                  render: (r) => <span className={toneClass(r.depositTone)}>{r.deposit}</span>,
                },
                {
                  key: 'balance',
                  header: 'Balance',
                  render: (r) => <span className={toneClass(r.balanceTone)}>{r.balance}</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => <Badge variant={r.status}>{r.statusLabel}</Badge>,
                },
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
              data={orders}
              getRowKey={(r) => r.id}
            />
          </GlassCard>
        </BentoItem>
        <BentoItem span={5}>
          <GlassCard title="Asset Catalog Quick View">
            <div className={styles.assetList}>
              {assets.map((asset) => (
                <div key={asset.id} className={styles.assetRow}>
                  <div className="flexRowLg">
                    <span aria-hidden>{asset.emoji}</span>
                    <div>
                      <strong className={styles.assetName}>{asset.name}</strong>
                      <div className="tms-t3">{asset.detail}</div>
                    </div>
                  </div>
                  <Badge variant={asset.status}>{asset.statusLabel}</Badge>
                </div>
              ))}
            </div>
          </GlassCard>
        </BentoItem>
      </BentoGrid>

      <GlassCard
        title="🔍 Return Inspection — Community Org. (Chairs)"
        headerRight={<Badge variant="error">Overdue</Badge>}
      >
        <div className="formGrid">
          <div>
            <p className="tms-t2 mb2">
              48 Banquet Chairs · Due Jun 3 · <strong style={{ color: 'var(--red)' }}>2 days overdue</strong>
            </p>
            <div className="formGroup">
              <label>Chairs Returned</label>
              <input defaultValue="46" readOnly />
            </div>
            <div className="formGroup">
              <label>Damaged</label>
              <input defaultValue="1" readOnly />
            </div>
            <div className="formGroup">
              <label>Missing</label>
              <input defaultValue="1" readOnly />
            </div>
          </div>
          <div className="calloutRed">
            <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: '0.5rem' }}>
              Damage Invoice Auto-Generated
            </div>
            <div className={styles.invoiceRow}>
              <span>Missing Chair (×1)</span>
              <span>$45.00</span>
            </div>
            <div className={styles.invoiceRow}>
              <span>Damaged Chair (×1)</span>
              <span>$20.00</span>
            </div>
            <div className={styles.invoiceRow}>
              <span>Late return fee (2 days)</span>
              <span>$10.00</span>
            </div>
            <div className={styles.invoiceTotal}>
              <strong>Deduct from deposit</strong>
              <strong style={{ color: 'var(--red)' }}>$75.00</strong>
            </div>
            <div className={styles.invoiceRow}>
              <span>Deposit held</span>
              <span>$150.00</span>
            </div>
            <div className="flexBetween">
              <span>Refund to client</span>
              <strong style={{ color: 'var(--gr)' }}>$75.00</strong>
            </div>
          </div>
        </div>
        <div className="flexRow mt2">
          <Button variant="primary">Confirm Inspection & Process Refund</Button>
          <Button>Cancel</Button>
        </div>
      </GlassCard>
    </>
  );
}
