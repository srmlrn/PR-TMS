'use client';

import { useMemo, useState } from 'react';
import { Button, GlassCard, PageHeader, Chip } from '@tms/ui';
import { Currency } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { formatMoney } from '@/lib/api/endpoints';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './book.module.css';

export default function BookSevaPage() {
  const { user } = useAuth();
  const { api } = useTenant();
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState('');
  const [sponsorName, setSponsorName] = useState(user?.name ?? '');
  const [gotram, setGotram] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: services, loading, error } = useApi((ep) => ep.getServices());

  const { data: slotsData, loading: slotsLoading } = useApi(
    (ep) =>
      serviceId
        ? ep.getServiceSlots(serviceId, date)
        : Promise.resolve({ serviceId: '', date, slots: [] }),
    [serviceId, date],
  );

  const selectedService = useMemo(
    () => services?.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  async function handleBook() {
    if (!user?.devoteeId || !serviceId || !slot) {
      setMessage('Select a service, date, and time slot.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const ep = createEndpoints(api);
      const scheduledAt = new Date(`${date}T${slot}`).toISOString();
      await ep.createBooking({
        devoteeId: user.devoteeId,
        serviceId,
        scheduledAt,
        channel: 'app',
        sankalpa: sponsorName
          ? { sponsorName, gotram: gotram || undefined }
          : undefined,
      });
      setMessage('Booking confirmed! Check your home page for details.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Book Seva" subtitle="Select a service, date, and sankalpa details" />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.grid}>
        <GlassCard title="1 · Choose Service">
          <div className={styles.serviceList}>
            {(services ?? []).map((svc) => (
              <button
                key={svc.id}
                type="button"
                className={`${styles.serviceCard} ${serviceId === svc.id ? styles.selected : ''}`}
                onClick={() => setServiceId(svc.id)}
              >
                <strong>{svc.name}</strong>
                <span className="tms-t3">{svc.deity}</span>
                <Chip>{formatMoney(svc.price, svc.currency ?? Currency.USD)}</Chip>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="2 · Date & Time">
          <div className="formGroup">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {slotsLoading && <p className="tms-t3">Loading slots…</p>}
          <div className={styles.slots}>
            {(slotsData?.slots ?? [])
              .filter((s) => s.available)
              .map((s) => (
                <button
                  key={s.startTime}
                  type="button"
                  className={`${styles.slot} ${slot === s.startTime ? styles.slotActive : ''}`}
                  onClick={() => setSlot(s.startTime)}
                >
                  {s.startTime}
                </button>
              ))}
          </div>
        </GlassCard>

        <GlassCard title="3 · Sankalpa">
          <div className="formGrid">
            <div className="formGroup">
              <label htmlFor="sponsor">Sponsor name</label>
              <input
                id="sponsor"
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="gotram">Gotram</label>
              <input id="gotram" value={gotram} onChange={(e) => setGotram(e.target.value)} />
            </div>
          </div>
          {selectedService && (
            <p className="tms-t2 mt1">
              Total: {formatMoney(selectedService.price, selectedService.currency)}
            </p>
          )}
          <Button onClick={handleBook} disabled={submitting} className="mt1">
            {submitting ? 'Booking…' : 'Confirm Booking'}
          </Button>
          {message && <p className="tms-t2 mt1">{message}</p>}
        </GlassCard>
      </div>
    </>
  );
}
