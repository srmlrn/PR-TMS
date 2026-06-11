'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, GlassCard, ProgressBar } from '@tms/ui';
import { Currency, DonationFrequency, type PaymentProvider, type TaxReceipt } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import { PaymentModeBadge } from '@/components/PaymentModeBadge';
import { PaymentProviderPicker } from '@/components/PaymentProviderPicker';
import { useLivePaymentGate } from '@/hooks/use-live-payment-gate';
import { checkoutAndPay, defaultPaymentProvider } from '@/lib/payment-flow';
import { kioskStrings, parseKioskLang } from '@/lib/kiosk-i18n';
import { useTenantSite } from '@/lib/tenant-site';
import styles from './donate.module.css';

const AMOUNTS_USD = [25, 51, 101, 251, 501, 1001];

const TAX_ID_LABEL: Record<Currency, string> = {
  [Currency.USD]: 'SSN / EIN (optional, for IRS receipt)',
  [Currency.INR]: 'PAN (optional, for 80G receipt)',
  [Currency.CAD]: 'SIN (optional, for CRA receipt)',
  [Currency.GBP]: 'Tax reference (optional)',
};

export default function DonatePage() {
  const { user } = useAuth();
  const { api } = useTenant();
  const site = useTenantSite();
  const searchParams = useSearchParams();
  const channel = (searchParams.get('channel') as 'app' | 'kiosk' | 'counter') ?? 'app';
  const kioskLang = channel === 'kiosk' ? parseKioskLang(searchParams.get('lang')) : null;
  const kioskT = kioskLang ? kioskStrings(kioskLang, site.name) : null;
  const [fxHint, setFxHint] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TaxReceipt | null>(null);
  const [lastDonationId, setLastDonationId] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(() =>
    defaultPaymentProvider(Currency.USD, channel),
  );
  const [amount, setAmount] = useState(101);
  const [currency, setCurrency] = useState<Currency>(Currency.USD);
  const [frequency, setFrequency] = useState<DonationFrequency>(
    DonationFrequency.ONE_TIME,
  );
  const [taxId, setTaxId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [purpose, setPurpose] = useState('General Hundi');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isInKind, setIsInKind] = useState(false);
  const [inKindDescription, setInKindDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const getPayer = useCallback(
    () => ({
      name: user?.name,
      email: user?.email,
    }),
    [user],
  );
  const { gate: livePaymentGate, livePaymentModal } = useLivePaymentGate(getPayer);

  const { data: campaigns, loading, error } = useApi((ep) => ep.getCampaigns());

  useEffect(() => {
    setPaymentProvider(defaultPaymentProvider(currency, channel));
  }, [currency, channel]);

  useEffect(() => {
    const ep = createEndpoints(api);
    ep.getFxRates().then((fx) => {
      if (currency !== Currency.USD) {
        const usd = amount / (fx.rates[currency] ?? 1);
        setFxHint(`≈ ${formatMoney(usd, Currency.USD)} USD equivalent`);
      } else {
        setFxHint(null);
      }
    }).catch(() => setFxHint(null));
  }, [api, currency, amount]);

  async function handleDonate() {
    if (!user?.devoteeId) {
      setMessage('Devotee profile not linked to your account.');
      return;
    }
    if (isInKind && !inKindDescription.trim()) {
      setMessage('Describe the in-kind offering (e.g. groceries, flowers).');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const ep = createEndpoints(api);
      const paymentSessionId = isInKind
        ? undefined
        : await checkoutAndPay(
            ep,
            {
              amount,
              currency,
              purpose,
              devoteeId: user.devoteeId,
              provider: paymentProvider,
            },
            livePaymentGate,
          );

      const donation = await ep.createDonation({
        devoteeId: user.devoteeId,
        amount: isInKind ? 0 : amount,
        currency,
        purpose: isInKind && inKindDescription
          ? `${purpose} — ${inKindDescription}`
          : purpose,
        frequency,
        campaignId: campaignId || undefined,
        taxId: taxId || undefined,
        paymentSessionId: isInKind ? undefined : paymentSessionId,
        isAnonymous,
        isInKind,
        inKindDescription: inKindDescription || undefined,
      });

      setLastDonationId(donation.id);
      const receiptData = await ep.getDonationReceipt(donation.id);
      setReceipt(receiptData);
      setMessage(
        `Thank you! ${formatMoney(amount, currency)} recorded. Receipt ${donation.receiptNumber ?? donation.id.slice(0, 8)}.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Donation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageIntro
        subtitle={
          kioskT?.donatePageSubtitle ??
          `Support ${site.name} — IRS / 80G / CRA compliant receipts`
        }
        actions={<PaymentModeBadge />}
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.grid}>
        <GlassCard title="Campaigns">
          <div className={styles.campaigns}>
            {(campaigns ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.campaign} ${campaignId === c.id ? styles.active : ''}`}
                onClick={() => {
                  setCampaignId(c.id);
                  setPurpose(c.name);
                  setCurrency(c.currency);
                }}
              >
                <strong>{c.name}</strong>
                <ProgressBar value={(c.raisedAmount / c.targetAmount) * 100} />
                <span className="tms-t3">
                  {formatMoney(c.raisedAmount, c.currency)} of{' '}
                  {formatMoney(c.targetAmount, c.currency)}
                </span>
              </button>
            ))}
            <button
              type="button"
              className={`${styles.campaign} ${!campaignId ? styles.active : ''}`}
              onClick={() => {
                setCampaignId('');
                setPurpose('General Hundi');
              }}
            >
              <strong>General Hundi</strong>
              <span className="tms-t3">Unrestricted offering</span>
            </button>
          </div>
        </GlassCard>

        <GlassCard title="Your Offering">
          <div className="formGrid">
            <div className="formGroup">
              <label htmlFor="currency">Currency</label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {Object.values(Currency).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="formGroup">
              <label htmlFor="frequency">Frequency</label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as DonationFrequency)}
              >
                <option value={DonationFrequency.ONE_TIME}>One-time</option>
                <option value={DonationFrequency.MONTHLY}>Monthly</option>
                <option value={DonationFrequency.ANNUAL}>Annual</option>
              </select>
            </div>
          </div>

          <div className={styles.amounts}>
            {AMOUNTS_USD.map((a) => (
              <button
                key={a}
                type="button"
                className={`${styles.amountBtn} ${amount === a ? styles.amountActive : ''}`}
                onClick={() => setAmount(a)}
              >
                {formatMoney(a, currency)}
              </button>
            ))}
          </div>
          <div className="formGroup mt1">
            <label htmlFor="custom">Custom amount</label>
            <input
              id="custom"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="formGroup mt1">
            <label htmlFor="taxId">{TAX_ID_LABEL[currency]}</label>
            <input
              id="taxId"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>
          <div className="formGroup mt1">
            <label>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />{' '}
              Donate anonymously (name hidden on public donor lists)
            </label>
          </div>
          <div className="formGroup mt1">
            <label>
              <input
                type="checkbox"
                checked={isInKind}
                onChange={(e) => setIsInKind(e.target.checked)}
              />{' '}
              In-kind offering (goods or services, not cash)
            </label>
          </div>
          {isInKind && (
            <div className="formGroup mt1">
              <label htmlFor="inKindDescription">In-kind description *</label>
              <input
                id="inKindDescription"
                value={inKindDescription}
                onChange={(e) => setInKindDescription(e.target.value)}
              />
            </div>
          )}
          {fxHint && <p className="tms-t3 mt1">{fxHint}</p>}
          {!isInKind && (
          <PaymentProviderPicker
            value={paymentProvider}
            onChange={setPaymentProvider}
            currency={currency}
            channel={channel}
          />
          )}
          <Button onClick={handleDonate} disabled={submitting} fullWidth className="mt1">
            {submitting
              ? 'Processing…'
              : isInKind
                ? 'Record in-kind offering'
                : `Donate ${formatMoney(amount, currency)}`}
          </Button>
          {message && <p className="tms-t2 mt1">{message}</p>}
          {receipt && (
            <GlassCard title="Tax Receipt" className="mt1">
              <dl className="formGrid">
                <div className="formGroup">
                  <dt className="tms-t3">Receipt #</dt>
                  <dd>{receipt.receiptNumber}</dd>
                </div>
                <div className="formGroup">
                  <dt className="tms-t3">Amount</dt>
                  <dd>{formatMoney(receipt.amount, receipt.currency)}</dd>
                </div>
                <div className="formGroup">
                  <dt className="tms-t3">Purpose</dt>
                  <dd>{receipt.purpose}</dd>
                </div>
                <div className="formGroup">
                  <dt className="tms-t3">Temple</dt>
                  <dd>{receipt.templeName}</dd>
                </div>
                <div className="formGroup">
                  <dt className="tms-t3">Issued</dt>
                  <dd>{new Date(receipt.issuedAt).toLocaleString()}</dd>
                </div>
                {receipt.taxDocType && (
                  <div className="formGroup">
                    <dt className="tms-t3">Tax document</dt>
                    <dd>{receipt.taxDocType}</dd>
                  </div>
                )}
                {receipt.taxId && (
                  <div className="formGroup">
                    <dt className="tms-t3">Tax ID</dt>
                    <dd>{receipt.taxId}</dd>
                  </div>
                )}
              </dl>
              <div className="flexRow mt1">
                <Button
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(receipt, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `receipt-${receipt.receiptNumber}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download receipt (JSON)
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (lastDonationId) {
                      window.open(`/devotee/receipt/donation/${lastDonationId}`, '_blank');
                    }
                  }}
                >
                  Print receipt
                </Button>
              </div>
            </GlassCard>
          )}
        </GlassCard>
      </div>

      {livePaymentModal}
    </>
  );
}
