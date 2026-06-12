'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, GlassCard } from '@tms/ui';
import {
  Currency,
  deitySelectOptions,
  donationFundOptionsForTenant,
  COUNTER_PAYMENT_METHOD_LABELS,
  type CounterPaymentMethod,
  type PosProduct,
  type DevoteeLookupResult,
  type PaymentProvider,
  type SevaService,
  type ServiceLocation,
  defaultSevaServiceLocation,
  dedupeSevaServicesByName,
  resolveSevaUnitPrice,
  sevaSupportsOffSite,
} from '@tms/types';
import type { PaymentSession, TerminalCheckoutStatus, TerminalReader } from '@tms/types';
import type { Endpoints } from '@/lib/api/endpoints';
import { formatMoney } from '@/lib/api/endpoints';
import { useLivePaymentGate } from '@/hooks/use-live-payment-gate';
import { checkoutAndPay } from '@/lib/payment-flow';
import { runTerminalCheckout } from '@/lib/terminal-payment-flow';
import {
  readTerminalReaderPreference,
  writeTerminalReaderPreference,
} from '@/lib/terminal-reader-storage';
import { PaymentScanQrModal } from '@/components/PaymentScanQrModal';
import { TerminalPaymentModal } from '@/components/TerminalPaymentModal';
import { resolvePosQuickLinkProducts, resolvePosQuickLinkServices } from '@/lib/pos-quick-links';
import { useTenant } from '@/lib/tenant-context';
import styles from './CounterPosForm.module.css';

type PosTab = 'services' | 'sales' | 'donations';

interface ServiceLine {
  key: string;
  serviceId: string;
  deity: string;
  date: string;
  location: ServiceLocation;
  quantity: number;
  unitCost: number;
}

interface DonationLine {
  key: string;
  purpose: string;
  amount: number;
}

interface SalesLine {
  key: string;
  itemId: string;
  quantity: number;
}

interface Props {
  ep: Endpoints;
  devotee: NonNullable<DevoteeLookupResult['devotee']>;
  services: SevaService[];
  products: PosProduct[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  className?: string;
}

let lineKey = 0;
function nextKey(): string {
  lineKey += 1;
  return `line-${lineKey}`;
}

function mapPaymentMethod(method: CounterPaymentMethod): PaymentProvider {
  if (method === 'card' || method === 'apple_pay' || method === 'google_pay') {
    return 'stripe';
  }
  if (method === 'paypal') {
    return 'paypal';
  }
  return 'cash';
}

function isStripeCounterPayment(method: CounterPaymentMethod): boolean {
  return method === 'card';
}

function isPayPalCounterPayment(method: CounterPaymentMethod): boolean {
  return method === 'paypal';
}

function isTerminalCounterPayment(method: CounterPaymentMethod): boolean {
  return method === 'card_terminal';
}

function isWalletQrPayment(method: CounterPaymentMethod): boolean {
  return method === 'apple_pay' || method === 'google_pay';
}

function catalogUnitCost(svc: SevaService, location: ServiceLocation): number {
  return resolveSevaUnitPrice(svc, location);
}

export function CounterPosForm({
  ep,
  devotee,
  services,
  products,
  onSuccess,
  onError,
  className,
}: Props) {
  const router = useRouter();
  const { tenantId } = useTenant();
  const today = new Date().toISOString().slice(0, 10);
  const catalogServices = useMemo(() => dedupeSevaServicesByName(services), [services]);
  const currency = (catalogServices[0]?.currency as Currency) ?? Currency.USD;
  const donationFunds = useMemo(
    () => donationFundOptionsForTenant(tenantId),
    [tenantId],
  );

  const [tab, setTab] = useState<PosTab>('services');
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(() => {
    const initial = dedupeSevaServicesByName(services);
    if (!initial[0]) return [];
    const location = defaultSevaServiceLocation(initial[0]);
    return [
      {
        key: nextKey(),
        serviceId: initial[0].id,
        deity: initial[0].deity,
        date: today,
        location,
        quantity: 1,
        unitCost: catalogUnitCost(initial[0], location),
      },
    ];
  });
  const [donationLines, setDonationLines] = useState<DonationLine[]>([]);
  const [salesLines, setSalesLines] = useState<SalesLine[]>([]);
  const [gotram, setGotram] = useState(devotee.gotram ?? '');
  const [nakshatra, setNakshatra] = useState(devotee.nakshatra ?? '');
  const [occasion, setOccasion] = useState('');
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CounterPaymentMethod>('cash');
  const [checkNumber, setCheckNumber] = useState('');
  const [totalPaid, setTotalPaid] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [quickLinksOpen, setQuickLinksOpen] = useState(false);
  const quickLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!quickLinksOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!quickLinksRef.current?.contains(event.target as Node)) {
        setQuickLinksOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQuickLinksOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [quickLinksOpen]);

  const getPayer = useCallback(
    () => ({ name: devotee.name, phone: devotee.phone }),
    [devotee],
  );
  const { gate, livePaymentModal } = useLivePaymentGate(getPayer);
  const [walletQrPay, setWalletQrPay] = useState<{
    session: PaymentSession;
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);
  const [terminalPay, setTerminalPay] = useState<{
    sessionId?: string;
    amount: number;
    status: TerminalCheckoutStatus | null;
  } | null>(null);
  const [terminalEnabled, setTerminalEnabled] = useState(false);
  const [terminalReaders, setTerminalReaders] = useState<TerminalReader[]>([]);
  const [selectedReaderId, setSelectedReaderId] = useState('');
  const [readersLoading, setReadersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ep.getTerminalConfig()
      .then((config) => {
        if (!cancelled) setTerminalEnabled(config.enabled);
      })
      .catch(() => {
        if (!cancelled) setTerminalEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ep]);

  useEffect(() => {
    if (!terminalEnabled) {
      setTerminalReaders([]);
      setSelectedReaderId('');
      return;
    }

    let cancelled = false;
    setReadersLoading(true);
    ep.listTerminalReaders()
      .then((readers) => {
        if (cancelled) return;
        setTerminalReaders(readers);
        const saved = readTerminalReaderPreference(tenantId);
        const preferred =
          (saved && readers.some((r) => r.id === saved) ? saved : undefined) ||
          readers.find((r) => r.status === 'online')?.id ||
          readers[0]?.id ||
          '';
        setSelectedReaderId(preferred);
      })
      .catch(() => {
        if (!cancelled) {
          setTerminalReaders([]);
          setSelectedReaderId('');
        }
      })
      .finally(() => {
        if (!cancelled) setReadersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [terminalEnabled, ep, tenantId]);

  function waitForWalletQr(session: PaymentSession): Promise<void> {
    return new Promise((resolve, reject) => {
      setWalletQrPay({ session, resolve, reject });
    });
  }

  const serviceTotal = useMemo(
    () => serviceLines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0),
    [serviceLines],
  );
  const donationTotal = useMemo(
    () => donationLines.reduce((sum, l) => sum + l.amount, 0),
    [donationLines],
  );
  const salesTotal = useMemo(
    () =>
      salesLines.reduce((sum, l) => {
        const item = products.find((s) => s.id === l.itemId);
        return sum + (item?.price ?? 0) * l.quantity;
      }, 0),
    [salesLines, products],
  );
  const grandTotal = Math.round((serviceTotal + donationTotal + salesTotal) * 100) / 100;

  const effectiveTotalPaid = totalPaid === '' ? grandTotal : totalPaid;

  function addServiceLine(prefill?: Partial<ServiceLine>) {
    const svc = catalogServices.find((s) => s.id === prefill?.serviceId) ?? catalogServices[0];
    if (!svc) return;
    const location = prefill?.location ?? defaultSevaServiceLocation(svc);
    setServiceLines((rows) => [
      ...rows,
      {
        key: nextKey(),
        serviceId: svc.id,
        deity: prefill?.deity ?? svc.deity,
        date: prefill?.date ?? today,
        location,
        quantity: prefill?.quantity ?? 1,
        unitCost: prefill?.unitCost ?? catalogUnitCost(svc, location),
      },
    ]);
    setTab('services');
  }

  function updateServiceLine(key: string, patch: Partial<ServiceLine>) {
    setServiceLines((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        const svc = catalogServices.find((s) => s.id === (patch.serviceId ?? next.serviceId));
        if (svc) {
          if (patch.serviceId && patch.deity === undefined) {
            next.deity = svc.deity;
          }
          let location = next.location;
          if (patch.serviceId && patch.location === undefined) {
            location = defaultSevaServiceLocation(svc);
            next.location = location;
          }
          if (!sevaSupportsOffSite(svc)) {
            location = 'on_site';
            next.location = 'on_site';
          }
          if (patch.serviceId || patch.location) {
            next.unitCost = catalogUnitCost(svc, location);
          }
        }
        return next;
      }),
    );
  }

  function removeServiceLine(key: string) {
    setServiceLines((rows) => rows.filter((r) => r.key !== key));
  }

  function addDonationLine() {
    setDonationLines((rows) => [
      ...rows,
      { key: nextKey(), purpose: donationFunds[0] ?? 'General Hundi', amount: 51 },
    ]);
    setTab('donations');
  }

  function updateDonationLine(key: string, patch: Partial<DonationLine>) {
    setDonationLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeDonationLine(key: string) {
    setDonationLines((rows) => rows.filter((r) => r.key !== key));
  }

  function addSalesLine(itemId?: string) {
    const id = itemId ?? products[0]?.id ?? '';
    setSalesLines((rows) => [...rows, { key: nextKey(), itemId: id, quantity: 1 }]);
    setTab('sales');
  }

  function updateSalesLine(key: string, patch: Partial<SalesLine>) {
    setSalesLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeSalesLine(key: string) {
    setSalesLines((rows) => rows.filter((r) => r.key !== key));
  }

  function handleCancel() {
    setServiceLines(() => {
      if (!catalogServices[0]) return [];
      const location = defaultSevaServiceLocation(catalogServices[0]);
      return [
        {
          key: nextKey(),
          serviceId: catalogServices[0].id,
          deity: catalogServices[0].deity,
          date: today,
          location,
          quantity: 1,
          unitCost: catalogUnitCost(catalogServices[0], location),
        },
      ];
    });
    setDonationLines([]);
    setSalesLines([]);
    setComment('');
    setCheckNumber('');
    setTotalPaid('');
    setPaymentMethod('cash');
  }

  async function handleSubmit() {
    if (serviceLines.length === 0 && donationLines.length === 0 && salesLines.length === 0) {
      onError('Add at least one service, donation, or sale line.');
      return;
    }
    if (Math.abs(effectiveTotalPaid - grandTotal) > 0.01) {
      onError(`Total paid must match cart total (${formatMoney(grandTotal, currency)}).`);
      return;
    }
    if (paymentMethod === 'check' && !checkNumber.trim()) {
      onError('Enter check number for check payments.');
      return;
    }

    setBusy(true);
    try {
      const provider = mapPaymentMethod(paymentMethod);
      let paymentSessionId: string;

      if (isWalletQrPayment(paymentMethod)) {
        const session = await ep.createPaymentSession({
          amount: grandTotal,
          currency,
          provider: 'stripe',
          purpose: `Counter POS — ${devotee.name}`,
          devoteeId: devotee.id,
        });
        await waitForWalletQr(session);
        paymentSessionId = session.id;
      } else if (isTerminalCounterPayment(paymentMethod)) {
        setTerminalPay({ amount: grandTotal, status: null });
        try {
          paymentSessionId = await runTerminalCheckout(
            ep,
            {
              amount: grandTotal,
              currency,
              purpose: `Counter POS — ${devotee.name}`,
              devoteeId: devotee.id,
              readerId: selectedReaderId || undefined,
            },
            (status) => {
              setTerminalPay((prev) => ({
                sessionId: status.sessionId,
                amount: grandTotal,
                status,
              }));
            },
          );
        } finally {
          setTerminalPay(null);
        }
      } else {
        paymentSessionId = await checkoutAndPay(
          ep,
          {
            amount: grandTotal,
            currency,
            purpose: `Counter POS — ${devotee.name}`,
            devoteeId: devotee.id,
            provider,
          },
          isStripeCounterPayment(paymentMethod) || isPayPalCounterPayment(paymentMethod)
            ? gate
            : undefined,
        );
      }

      const result = await ep.posCheckout({
        devoteeId: devotee.id,
        currency,
        services: serviceLines.map((l) => ({
          serviceId: l.serviceId,
          date: l.date,
          location: l.location,
          quantity: l.quantity,
          unitCost: l.unitCost,
          deity: l.deity,
        })),
        donations: donationLines.map((l) => ({
          purpose: l.purpose,
          amount: l.amount,
        })),
        sales: salesLines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
        })),
        comment: comment.trim() || undefined,
        paymentSessionId,
        totalPaid: effectiveTotalPaid,
        checkNumber: paymentMethod === 'check' ? checkNumber.trim() : undefined,
        paymentMethod,
        sankalpa: {
          gotram: gotram || undefined,
          nakshatra: nakshatra || undefined,
          occasion: occasion || undefined,
        },
      });

      const summary = [
        result.bookings.length ? `${result.bookings.length} seva(s)` : '',
        result.donations.length ? `${result.donations.length} donation/sale(s)` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      onSuccess(
        `POS checkout complete · ${summary} · Receipt ${result.receiptNumber} · ${formatMoney(result.grandTotal, result.currency)}`,
      );

      router.push(
        `/frontdesk/invoice-print?devoteeId=${encodeURIComponent(devotee.id)}` +
          `&invoiceId=${encodeURIComponent(result.checkoutReceiptId)}`,
      );

      handleCancel();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'POS checkout failed');
    } finally {
      setBusy(false);
    }
  }

  const quickLinkServices = useMemo(
    () => resolvePosQuickLinkServices(tenantId, catalogServices),
    [tenantId, catalogServices],
  );
  const quickLinkProducts = useMemo(
    () => resolvePosQuickLinkProducts(products),
    [products],
  );

  const quickLinksHeader = (
    <div className={styles.quickLinksAnchor} ref={quickLinksRef}>
      <button
        type="button"
        className={styles.quickLinksIconBtn}
        onClick={() => setQuickLinksOpen((open) => !open)}
        aria-label="Quick links"
        aria-expanded={quickLinksOpen}
        aria-haspopup="menu"
        title="Quick links"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      </button>
      {quickLinksOpen && (
        <div className={styles.quickLinksPopup} role="menu" aria-label="Quick links">
          <p className={styles.quickLinksPopupTitle}>Quick links</p>
          <div className={styles.quickLinksScroll}>
            {quickLinkServices.map((svc) => (
              <button
                key={svc.id}
                type="button"
                className={styles.quickLink}
                role="menuitem"
                onClick={() => {
                  addServiceLine({ serviceId: svc.id });
                  setQuickLinksOpen(false);
                }}
              >
                <strong>{svc.name}</strong>
                <span>
                  {svc.deity} · On {formatMoney(svc.price, svc.currency)}
                  {sevaSupportsOffSite(svc) && svc.priceOffSite != null && (
                    <> · Off {formatMoney(svc.priceOffSite, svc.currency)}</>
                  )}
                </span>
              </button>
            ))}
            {quickLinkProducts.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.quickLink}
                role="menuitem"
                onClick={() => {
                  addSalesLine(item.id);
                  setQuickLinksOpen(false);
                }}
              >
                <strong>{item.name}</strong>
                <span>{formatMoney(item.price, item.currency)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <GlassCard
        compact
        title="Counter POS"
        headerRight={quickLinksHeader}
        className={[styles.posCard, className ?? ''].filter(Boolean).join(' ')}
        bodyClassName={styles.posCardBody}
      >
      <div className={styles.pos}>
        <div className={styles.body}>
          <div className={styles.workArea}>
          <div className={styles.main}>
          <div className={styles.mainScroll}>
          <div className={styles.sankalpaRow}>
            <div className="formGroup">
              <label htmlFor="posGotram">Gotram</label>
              <input id="posGotram" value={gotram} onChange={(e) => setGotram(e.target.value)} />
            </div>
            <div className="formGroup">
              <label htmlFor="posNakshatra">Nakshatra</label>
              <input
                id="posNakshatra"
                value={nakshatra}
                onChange={(e) => setNakshatra(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="posOccasion">Occasion</label>
              <input
                id="posOccasion"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.tabs}>
            {(['services', 'sales', 'donations'] as PosTab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'services' ? 'Services' : t === 'sales' ? 'Sales' : 'Donations'}
                {t === 'services' && serviceLines.length > 0 ? ` (${serviceLines.length})` : ''}
                {t === 'sales' && salesLines.length > 0 ? ` (${salesLines.length})` : ''}
                {t === 'donations' && donationLines.length > 0 ? ` (${donationLines.length})` : ''}
              </button>
            ))}
          </div>

          {tab === 'services' && (
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.tableServices}`}>
                <colgroup>
                  <col className={styles.colService} />
                  <col className={styles.colDeity} />
                  <col className={styles.colLocation} />
                  <col className={styles.colDate} />
                  <col className={styles.colCost} />
                  <col className={styles.colQty} />
                  <col className={styles.colTotal} />
                  <col className={styles.colAction} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Deity</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Donation</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {serviceLines.map((line) => {
                    const svc = catalogServices.find((s) => s.id === line.serviceId);
                    const lineDeityOptions = deitySelectOptions(catalogServices, line.deity);
                    const lineTotal = line.unitCost * line.quantity;
                    const offSiteAvailable = svc ? sevaSupportsOffSite(svc) : false;
                    return (
                      <tr key={line.key}>
                        <td>
                          <select
                            value={line.serviceId}
                            onChange={(e) =>
                              updateServiceLine(line.key, { serviceId: e.target.value })
                            }
                          >
                            {catalogServices.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={line.deity}
                            onChange={(e) =>
                              updateServiceLine(line.key, { deity: e.target.value })
                            }
                          >
                            {lineDeityOptions.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={line.location}
                            onChange={(e) =>
                              updateServiceLine(line.key, {
                                location: e.target.value as ServiceLocation,
                              })
                            }
                          >
                            <option value="on_site">On Site</option>
                            {offSiteAvailable && <option value="off_site">Off Site</option>}
                          </select>
                        </td>
                        <td>
                          <input
                            type="date"
                            value={line.date}
                            onChange={(e) => updateServiceLine(line.key, { date: e.target.value })}
                          />
                        </td>
                        <td className={styles.costReadonly}>
                          {formatMoney(line.unitCost, currency)}
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            className={styles.numInput}
                            value={line.quantity}
                            onChange={(e) =>
                              updateServiceLine(line.key, { quantity: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className={styles.lineTotal}>{formatMoney(lineTotal, currency)}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.rowBtn}
                              onClick={() => removeServiceLine(line.key)}
                              aria-label="Remove row"
                            >
                              −
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className={styles.addRow}>
                <Button size="sm" variant="outline" onClick={() => addServiceLine()}>
                  + Add service
                </Button>
              </div>
            </div>
          )}

          {tab === 'sales' && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sales item</th>
                    <th>Cost</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {salesLines.map((line) => {
                    const item = products.find((s) => s.id === line.itemId);
                    const lineTotal = (item?.price ?? 0) * line.quantity;
                    return (
                      <tr key={line.key}>
                        <td>
                          <select
                            value={line.itemId}
                            onChange={(e) =>
                              updateSalesLine(line.key, { itemId: e.target.value })
                            }
                          >
                            {products.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{item ? formatMoney(item.price, currency) : '—'}</td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            className={styles.numInput}
                            value={line.quantity}
                            onChange={(e) =>
                              updateSalesLine(line.key, { quantity: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className={styles.lineTotal}>{formatMoney(lineTotal, currency)}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.rowBtn}
                            onClick={() => removeSalesLine(line.key)}
                          >
                            −
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className={styles.addRow}>
                <Button size="sm" variant="outline" onClick={() => addSalesLine()}>
                  + Add sale
                </Button>
              </div>
              {salesLines.length === 0 && (
                <p className={styles.hint}>Articles recorded as counter donations (Article sale).</p>
              )}
            </div>
          )}

          {tab === 'donations' && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Donation fund</th>
                    <th>Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {donationLines.map((line) => (
                    <tr key={line.key}>
                      <td>
                        <select
                          value={line.purpose}
                          onChange={(e) =>
                            updateDonationLine(line.key, { purpose: e.target.value })
                          }
                        >
                          {donationFunds.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className={styles.numInput}
                          value={line.amount}
                          onChange={(e) =>
                            updateDonationLine(line.key, { amount: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.rowBtn}
                          onClick={() => removeDonationLine(line.key)}
                        >
                          −
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.addRow}>
                <Button size="sm" variant="outline" onClick={addDonationLine}>
                  + Add donation
                </Button>
              </div>
            </div>
          )}

          </div>
          </div>

          <aside className={styles.billingPanel}>
            <p className={styles.billingTitle}>Billing</p>
            <div className={`formGroup ${styles.checkoutComment}`}>
              <label htmlFor="posComment">Comment / notes</label>
              <input
                id="posComment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <div className={`formGroup ${styles.checkoutField}`}>
              <label htmlFor="posPayment">Payment type</label>
              <select
                id="posPayment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as CounterPaymentMethod)}
              >
                {(Object.keys(COUNTER_PAYMENT_METHOD_LABELS) as CounterPaymentMethod[])
                  .filter((method) => method !== 'card_terminal' || terminalEnabled)
                  .map((method) => (
                    <option key={method} value={method}>
                      {COUNTER_PAYMENT_METHOD_LABELS[method]}
                    </option>
                  ),
                )}
              </select>
              {isStripeCounterPayment(paymentMethod) && (
                <p className={styles.hint}>
                  Click Submit to open secure checkout — Apple Pay and Google Pay appear when
                  supported on this device.
                </p>
              )}
              {isPayPalCounterPayment(paymentMethod) && (
                <p className={styles.hint}>
                  Click Submit to open PayPal or Venmo checkout (US sandbox supports Venmo when
                  enabled in your PayPal app settings).
                </p>
              )}
              {isTerminalCounterPayment(paymentMethod) && (
                <>
                  <div className={`formGroup ${styles.checkoutField}`}>
                    <label htmlFor="posTerminalReader">Card reader (this counter)</label>
                    <select
                      id="posTerminalReader"
                      value={selectedReaderId}
                      disabled={readersLoading || terminalReaders.length === 0}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSelectedReaderId(next);
                        if (next) writeTerminalReaderPreference(tenantId, next);
                      }}
                    >
                      {readersLoading ? (
                        <option value="">Loading readers…</option>
                      ) : terminalReaders.length === 0 ? (
                        <option value="">Auto — first available reader</option>
                      ) : (
                        terminalReaders.map((reader) => (
                          <option key={reader.id} value={reader.id}>
                            {reader.label} · {reader.deviceType.replace(/^simulated_/, 'sim ')}
                            {reader.status !== 'online' ? ` (${reader.status})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                    <p className={styles.hint}>
                      Each counter PC remembers its reader. Register devices in Stripe, then Admin →
                      Load readers. Leave empty to auto-pick in test mode.
                    </p>
                  </div>
                  <p className={styles.hint}>
                    Click Submit to charge on the selected reader — swipe, insert chip, or tap
                    contactless.
                  </p>
                </>
              )}
              {isWalletQrPayment(paymentMethod) && (
                <p className={styles.hint}>
                  Click Submit to show a QR code — the customer scans with their phone and pays
                  with {paymentMethod === 'google_pay' ? 'Google Pay' : 'Apple Pay'} (IONOS-style
                  scan-to-pay).
                </p>
              )}
            </div>
            {paymentMethod === 'check' && (
              <div className={`formGroup ${styles.checkoutField}`}>
                <label htmlFor="posCheck">Check number</label>
                <input
                  id="posCheck"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                />
              </div>
            )}
            <div className={`formGroup ${styles.checkoutField}`}>
              <label htmlFor="posPaid">Total paid</label>
              <input
                id="posPaid"
                type="number"
                min={0}
                step={0.01}
                value={totalPaid === '' ? grandTotal : totalPaid}
                onChange={(e) =>
                  setTotalPaid(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
            <div className={styles.grandTotal}>Total: {formatMoney(grandTotal, currency)}</div>
            <div className={styles.footerActions}>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={busy || grandTotal <= 0}>
                {busy ? 'Processing…' : 'Submit'}
              </Button>
            </div>
          </aside>
          </div>
        </div>
      </div>
      </GlassCard>
      {livePaymentModal}
      {walletQrPay && (
        <PaymentScanQrModal
          session={walletQrPay.session}
          tenantId={tenantId}
          ep={ep}
          walletLabel={paymentMethod === 'google_pay' ? 'Google Pay' : 'Apple Pay'}
          onSuccess={() => {
            walletQrPay.resolve();
            setWalletQrPay(null);
          }}
          onCancel={() => {
            walletQrPay.reject(new Error('Payment cancelled'));
            setWalletQrPay(null);
          }}
        />
      )}
      {terminalPay && (
        <TerminalPaymentModal
          amount={terminalPay.amount}
          currency={currency}
          status={terminalPay.status}
          busy={busy}
          onCancel={() => {
            void (async () => {
              if (terminalPay.sessionId) {
                try {
                  await ep.cancelTerminalCheckout(terminalPay.sessionId);
                } catch {
                  /* reader may already be idle */
                }
              }
              setTerminalPay(null);
              setBusy(false);
              onError('Terminal payment cancelled.');
            })();
          }}
        />
      )}
    </>
  );
}
