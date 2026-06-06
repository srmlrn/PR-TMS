'use client';

import { useEffect, useState } from 'react';
import { Button, GlassCard, PageHeader, ProgressBar } from '@tms/ui';
import { Currency, DonationFrequency } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import { checkoutAndPay } from '@/lib/payment-flow';
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
  const [fxHint, setFxHint] = useState<string | null>(null);
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);
  const [amount, setAmount] = useState(101);
  const [currency, setCurrency] = useState<Currency>(Currency.USD);
  const [frequency, setFrequency] = useState<DonationFrequency>(
    DonationFrequency.ONE_TIME,
  );
  const [taxId, setTaxId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [purpose, setPurpose] = useState('General Hundi');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: campaigns, loading, error } = useApi((ep) => ep.getCampaigns());

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
    setSubmitting(true);
    setMessage(null);
    try {
      const ep = createEndpoints(api);
      const paymentSessionId = await checkoutAndPay(ep, {
        amount,
        currency,
        purpose,
        devoteeId: user.devoteeId,
        provider: currency === Currency.INR ? 'razorpay' : 'stripe',
      });

      const donation = await ep.createDonation({
        devoteeId: user.devoteeId,
        amount,
        currency,
        purpose,
        frequency,
        campaignId: campaignId || undefined,
        taxId: taxId || undefined,
        paymentSessionId,
      }) as { id: string; receiptNumber?: string };

      setLastReceiptId(donation.id);
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
      <PageHeader title="Donate" subtitle="Support the temple — IRS / 80G / CRA compliant receipts" />
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
              placeholder="Required for official tax receipt in some countries"
            />
          </div>
          {fxHint && <p className="tms-t3 mt1">{fxHint}</p>}
          <Button onClick={handleDonate} disabled={submitting} fullWidth className="mt1">
            {submitting ? 'Processing…' : `Donate ${formatMoney(amount, currency)}`}
          </Button>
          {message && <p className="tms-t2 mt1">{message}</p>}
          {lastReceiptId && (
            <Button
              variant="outline"
              className="mt1"
              onClick={async () => {
                const ep = createEndpoints(api);
                const receipt = await ep.getDonationReceipt(lastReceiptId);
                const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt-${receipt.receiptNumber}.json`;
                a.click();
              }}
            >
              Download tax receipt
            </Button>
          )}
        </GlassCard>
      </div>
    </>
  );
}
