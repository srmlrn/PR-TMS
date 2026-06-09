'use client';

import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@tms/ui';
import {
  Currency,
  deitySelectOptions,
  donationFundOptionsForTenant,
  type CounterPaymentMethod,
  type PosProduct,
  type DevoteeLookupResult,
  type PaymentProvider,
  type SevaService,
  type ServiceLocation,
  defaultSevaServiceLocation,
  resolveSevaUnitPrice,
  sevaSupportsOffSite,
} from '@tms/types';
import type { Endpoints } from '@/lib/api/endpoints';
import { formatMoney } from '@/lib/api/endpoints';
import { useLivePaymentGate } from '@/hooks/use-live-payment-gate';
import { checkoutAndPay } from '@/lib/payment-flow';
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
}

const QUICK_LINKS_COLLAPSED_KEY = 'tms-pos-quick-links-collapsed';

let lineKey = 0;
function nextKey(): string {
  lineKey += 1;
  return `line-${lineKey}`;
}

function readQuickLinksCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(QUICK_LINKS_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function mapPaymentMethod(method: CounterPaymentMethod): PaymentProvider {
  if (method === 'card') return 'stripe';
  return 'cash';
}

function catalogUnitCost(svc: SevaService, location: ServiceLocation): number {
  return resolveSevaUnitPrice(svc, location);
}

export function CounterPosForm({ ep, devotee, services, products, onSuccess, onError }: Props) {
  const router = useRouter();
  const { tenantId } = useTenant();
  const today = new Date().toISOString().slice(0, 10);
  const currency = (services[0]?.currency as Currency) ?? Currency.USD;
  const donationFunds = useMemo(
    () => donationFundOptionsForTenant(tenantId),
    [tenantId],
  );

  const [tab, setTab] = useState<PosTab>('services');
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(() => {
    if (!services[0]) return [];
    const location = defaultSevaServiceLocation(services[0]);
    return [
      {
        key: nextKey(),
        serviceId: services[0].id,
        deity: services[0].deity,
        date: today,
        location,
        quantity: 1,
        unitCost: catalogUnitCost(services[0], location),
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
  const [quickLinksOpen, setQuickLinksOpen] = useState(() => !readQuickLinksCollapsed());

  useLayoutEffect(() => {
    try {
      localStorage.setItem(QUICK_LINKS_COLLAPSED_KEY, quickLinksOpen ? '0' : '1');
    } catch {
      /* ignore */
    }
  }, [quickLinksOpen]);

  const getPayer = useCallback(
    () => ({ name: devotee.name, phone: devotee.phone }),
    [devotee],
  );
  const { gate, livePaymentModal } = useLivePaymentGate(getPayer);

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
    const svc = services.find((s) => s.id === prefill?.serviceId) ?? services[0];
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
        const svc = services.find((s) => s.id === (patch.serviceId ?? next.serviceId));
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
      if (!services[0]) return [];
      const location = defaultSevaServiceLocation(services[0]);
      return [
        {
          key: nextKey(),
          serviceId: services[0].id,
          deity: services[0].deity,
          date: today,
          location,
          quantity: 1,
          unitCost: catalogUnitCost(services[0], location),
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
      const paymentSessionId = await checkoutAndPay(
        ep,
        {
          amount: grandTotal,
          currency,
          purpose: `Counter POS — ${devotee.name}`,
          devoteeId: devotee.id,
          provider,
        },
        gate,
      );

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

      const guestName = encodeURIComponent(devotee.name);
      router.push(
        `/frontdesk/receipt-print?amount=${result.grandTotal}&currency=${result.currency}` +
          `&receipt=${encodeURIComponent(result.receiptNumber)}` +
          `&name=${guestName}&purpose=${encodeURIComponent('Counter POS checkout')}`,
      );

      handleCancel();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'POS checkout failed');
    } finally {
      setBusy(false);
    }
  }

  const quickLinkServices = useMemo(
    () => resolvePosQuickLinkServices(tenantId, services),
    [tenantId, services],
  );
  const quickLinkProducts = useMemo(
    () => resolvePosQuickLinkProducts(products),
    [products],
  );

  return (
    <>
      <div className={styles.pos}>
        <div className={styles.body}>
          <div
            className={styles.workArea}
            data-quick-links-collapsed={quickLinksOpen ? 'false' : 'true'}
          >
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
                    <th>Cost</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {serviceLines.map((line) => {
                    const svc = services.find((s) => s.id === line.serviceId);
                    const lineDeityOptions = deitySelectOptions(services, line.deity);
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
                            {services.map((s) => (
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

          <aside className={styles.checkoutPanel}>
            <div className={`formGroup ${styles.checkoutComment}`}>
              <label htmlFor="posComment">Comment / notes</label>
              <input
                id="posComment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional notes for receipt"
              />
            </div>
            <div className={`formGroup ${styles.checkoutField}`}>
              <label htmlFor="posPayment">Payment type</label>
              <select
                id="posPayment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as CounterPaymentMethod)}
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
              </select>
            </div>
            {paymentMethod === 'check' && (
              <div className={`formGroup ${styles.checkoutField}`}>
                <label htmlFor="posCheck">Check number</label>
                <input
                  id="posCheck"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="Check #"
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

          <aside
            className={[
              styles.quickLinksBar,
              quickLinksOpen ? '' : styles.quickLinksCollapsed,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.quickLinksHeader}>
              {quickLinksOpen && <p className={styles.quickLinksTitle}>Quick links</p>}
              <button
                type="button"
                className={styles.quickLinksToggle}
                onClick={() => setQuickLinksOpen((open) => !open)}
                aria-label={quickLinksOpen ? 'Collapse quick links' : 'Expand quick links'}
                aria-expanded={quickLinksOpen}
                title={quickLinksOpen ? 'Collapse quick links' : 'Expand quick links'}
              >
                <svg
                  className={[
                    styles.quickLinksChevron,
                    quickLinksOpen ? '' : styles.quickLinksChevronCollapsed,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
            {quickLinksOpen && (
            <div className={styles.quickLinksScroll}>
              {quickLinkServices.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  className={styles.quickLink}
                  onClick={() =>
                    addServiceLine({ serviceId: svc.id })
                  }
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
                  onClick={() => addSalesLine(item.id)}
                >
                  <strong>{item.name}</strong>
                  <span>{formatMoney(item.price, item.currency)}</span>
                </button>
              ))}
            </div>
            )}
          </aside>
          </div>
        </div>
      </div>
      {livePaymentModal}
    </>
  );
}
