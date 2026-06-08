'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  GlassCard,
} from '@tms/ui';
import { AppPage } from '@/components/AppPage';
import type {
  DonationSubscription,
  SevaSubscription,
  SevaSubscriptionFrequency,
} from '@tms/types';
import {
  createEndpoints,
  formatMoney,
  formatShortDate,
} from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';

type Tab = 'seva' | 'donations';

const SERVICE_LABELS: Record<string, string> = {
  'svc-archana': 'Archana',
  'svc-abhishekam': 'Abhishekam',
  'svc-homam': 'Homam',
};

export default function AdminSubscriptionsPage() {
  const { api } = useTenant();
  const [tab, setTab] = useState<Tab>('seva');
  const [actionId, setActionId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [createDevoteeId, setCreateDevoteeId] = useState('');
  const [createServiceId, setCreateServiceId] = useState('svc-archana');
  const [createFrequency, setCreateFrequency] = useState<SevaSubscriptionFrequency>('monthly');
  const [createNextDate, setCreateNextDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [createSponsor, setCreateSponsor] = useState('');
  const [creating, setCreating] = useState(false);

  const {
    data: sevaData,
    loading: sevaLoading,
    error: sevaError,
    refetch: refetchSeva,
  } = useApi((ep) => ep.getSevaSubscriptions());

  const {
    data: donationData,
    loading: donationLoading,
    error: donationError,
    refetch: refetchDonations,
  } = useApi((ep) => ep.getDonationSubscriptions());

  const { data: devotees } = useApi((ep) => ep.getDevotees({ limit: 100 }));

  const sevaSubs = sevaData?.data ?? [];
  const donationSubs = donationData?.data ?? [];

  async function handleSevaStatus(id: string, status: 'paused' | 'cancelled') {
    setActionId(id);
    setMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.updateSevaSubscription(id, { status });
      setMsg(`Seva subscription ${status}.`);
      await refetchSeva();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActionId(null);
    }
  }

  async function handleDonationStatus(id: string, status: 'paused' | 'cancelled') {
    setActionId(id);
    setMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.updateDonationSubscription(id, { status });
      setMsg(`Donation subscription ${status}.`);
      await refetchDonations();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActionId(null);
    }
  }

  async function handleCreateSeva() {
    if (!createDevoteeId) {
      setMsg('Select a devotee');
      return;
    }
    setCreating(true);
    setMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.createSevaSubscription({
        devoteeId: createDevoteeId,
        serviceId: createServiceId,
        frequency: createFrequency,
        nextDate: createNextDate,
        sankalpa: createSponsor.trim()
          ? { sponsorName: createSponsor.trim() }
          : undefined,
      });
      setMsg('Recurring seva subscription created.');
      await refetchSeva();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  function devoteeName(devoteeId: string): string {
    const d = devotees?.data.find((x) => x.id === devoteeId);
    return d ? `${d.firstName} ${d.lastName}` : devoteeId.slice(0, 12);
  }

  const loading = tab === 'seva' ? sevaLoading : donationLoading;
  const error = tab === 'seva' ? sevaError : donationError;

  return (
    <AppPage
      subtitle="Recurring archana/seva and donation auto-debit plans"
      loading={loading}
      error={error}
      showTenantContext={false}
    >
      <div className="flexRow mb2" style={{ gap: '0.5rem' }}>
        <Button
          size="sm"
          variant={tab === 'seva' ? 'primary' : 'outline'}
          onClick={() => setTab('seva')}
        >
          Seva subscriptions
        </Button>
        <Button
          size="sm"
          variant={tab === 'donations' ? 'primary' : 'outline'}
          onClick={() => setTab('donations')}
        >
          Donation subscriptions
        </Button>
      </div>

      {msg && <p className="tms-t2 mb1">{msg}</p>}

      {tab === 'seva' && (
        <>
          <GlassCard title="Create seva subscription" className="mb2">
            <div className="formGrid">
              <div className="formGroup">
                <label htmlFor="create-devotee">Devotee</label>
                <select
                  id="create-devotee"
                  value={createDevoteeId}
                  onChange={(e) => setCreateDevoteeId(e.target.value)}
                >
                  <option value="">Select devotee…</option>
                  {(devotees?.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="create-service">Service</label>
                <select
                  id="create-service"
                  value={createServiceId}
                  onChange={(e) => setCreateServiceId(e.target.value)}
                >
                  {Object.entries(SERVICE_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="create-freq">Frequency</label>
                <select
                  id="create-freq"
                  value={createFrequency}
                  onChange={(e) =>
                    setCreateFrequency(e.target.value as SevaSubscriptionFrequency)
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="create-next">Next date</label>
                <input
                  id="create-next"
                  type="date"
                  value={createNextDate}
                  onChange={(e) => setCreateNextDate(e.target.value)}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="create-sponsor">Sponsor name</label>
                <input
                  id="create-sponsor"
                  value={createSponsor}
                  onChange={(e) => setCreateSponsor(e.target.value)}
                  placeholder="Sankalpa sponsor"
                />
              </div>
              <div className="formGroup">
                <Button onClick={handleCreateSeva} disabled={creating}>
                  {creating ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Active seva subscriptions" noBodyPadding>
            <DataTable<SevaSubscription>
              getRowKey={(r) => r.id}
              columns={[
                {
                  key: 'devotee',
                  header: 'Devotee',
                  render: (r) => devoteeName(r.devoteeId),
                },
                {
                  key: 'service',
                  header: 'Service',
                  render: (r) => SERVICE_LABELS[r.serviceId] ?? r.serviceId,
                },
                { key: 'freq', header: 'Frequency', render: (r) => r.frequency },
                {
                  key: 'next',
                  header: 'Next date',
                  render: (r) => formatShortDate(r.nextDate),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => (
                    <Badge variant={r.status === 'active' ? 'ok' : 'pending'}>
                      {r.status}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (r) =>
                    r.status === 'active' ? (
                      <div className="flexRow" style={{ gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === r.id}
                          onClick={() => handleSevaStatus(r.id, 'paused')}
                        >
                          Pause
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === r.id}
                          onClick={() => handleSevaStatus(r.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : null,
                },
              ]}
              data={sevaSubs}
            />
          </GlassCard>
        </>
      )}

      {tab === 'donations' && (
        <GlassCard title="Recurring donation subscriptions" noBodyPadding>
          {donationSubs.length === 0 ? (
            <p className="tms-t2" style={{ padding: '1rem' }}>
              No active recurring donations. Devotees can set up monthly/annual gifts on the donate page.
            </p>
          ) : (
            <DataTable<DonationSubscription>
              getRowKey={(r) => r.id}
              columns={[
                {
                  key: 'devotee',
                  header: 'Devotee',
                  render: (r) => devoteeName(r.devoteeId),
                },
                { key: 'purpose', header: 'Purpose', render: (r) => r.purpose },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (r) => formatMoney(r.amount, r.currency),
                },
                { key: 'freq', header: 'Frequency', render: (r) => r.frequency },
                {
                  key: 'next',
                  header: 'Next billing',
                  render: (r) => formatShortDate(r.nextBillingAt),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => (
                    <Badge variant={r.status === 'active' ? 'ok' : 'pending'}>
                      {r.status}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (r) =>
                    r.status === 'active' ? (
                      <div className="flexRow" style={{ gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === r.id}
                          onClick={() => handleDonationStatus(r.id, 'paused')}
                        >
                          Pause
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === r.id}
                          onClick={() => handleDonationStatus(r.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : null,
                },
              ]}
              data={donationSubs}
            />
          )}
        </GlassCard>
      )}
    </AppPage>
  );
}
