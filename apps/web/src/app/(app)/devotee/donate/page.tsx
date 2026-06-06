'use client';

import { useState } from 'react';
import { Button, GlassCard, PageHeader, ProgressBar } from '@tms/ui';
import { Currency } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, formatMoney } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './donate.module.css';

const AMOUNTS = [25, 51, 101, 251, 501, 1001];

export default function DonatePage() {
  const { user } = useAuth();
  const { api } = useTenant();
  const [amount, setAmount] = useState(101);
  const [campaignId, setCampaignId] = useState('');
  const [purpose, setPurpose] = useState('General Hundi');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: campaigns, loading, error } = useApi((ep) => ep.getCampaigns());

  async function handleDonate() {
    if (!user?.devoteeId) {
      setMessage('Devotee profile not linked to your account.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const ep = createEndpoints(api);
      await ep.createDonation({
        devoteeId: user.devoteeId,
        amount,
        currency: Currency.USD,
        purpose,
        campaignId: campaignId || undefined,
      });
      setMessage(`Thank you! ${formatMoney(amount)} recorded. Tax receipt will be emailed.`);
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
          <div className={styles.amounts}>
            {AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                className={`${styles.amountBtn} ${amount === a ? styles.amountActive : ''}`}
                onClick={() => setAmount(a)}
              >
                {formatMoney(a)}
              </button>
            ))}
          </div>
          <div className="formGroup mt1">
            <label htmlFor="custom">Custom amount ($)</label>
            <input
              id="custom"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <Button onClick={handleDonate} disabled={submitting} fullWidth className="mt1">
            {submitting ? 'Processing…' : `Donate ${formatMoney(amount)}`}
          </Button>
          {message && <p className="tms-t2 mt1">{message}</p>}
        </GlassCard>
      </div>
    </>
  );
}
