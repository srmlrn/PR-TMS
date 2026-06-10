'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, GlassCard } from '@tms/ui';
import { Currency, type PaymentProvider } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { formatMoney } from '@/lib/api/endpoints';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import { PaymentModeBadge } from '@/components/PaymentModeBadge';
import { PaymentProviderPicker } from '@/components/PaymentProviderPicker';
import { useLivePaymentGate } from '@/hooks/use-live-payment-gate';
import { checkoutAndPay, defaultPaymentProvider } from '@/lib/payment-flow';
import { kioskStrings, parseKioskLang } from '@/lib/kiosk-i18n';
import { useTenantSite } from '@/lib/tenant-site';
import { RitualSelect } from '@/components/RitualSelect';
import styles from './book.module.css';

function formatSlotLabel(startTime: string): string {
  if (startTime.includes('T')) {
    const parsed = new Date(startTime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  }
  const [hours, minutes] = startTime.split(':');
  if (hours != null && minutes != null) {
    const d = new Date();
    d.setHours(Number(hours), Number(minutes), 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return startTime;
}

function slotToScheduledAt(date: string, startTime: string): string {
  if (startTime.includes('T')) {
    return new Date(startTime).toISOString();
  }
  return new Date(`${date}T${startTime}`).toISOString();
}

export default function BookSevaPage() {
  const { user } = useAuth();
  const { api } = useTenant();
  const site = useTenantSite();
  const searchParams = useSearchParams();
  const channel = (searchParams.get('channel') as 'app' | 'kiosk' | 'counter') ?? 'app';
  const kioskLang = channel === 'kiosk' ? parseKioskLang(searchParams.get('lang')) : null;
  const kioskT = kioskLang ? kioskStrings(kioskLang, site.name) : null;
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState('');
  const [sponsorName, setSponsorName] = useState(user?.name ?? '');
  const [gotram, setGotram] = useState('');
  const [nakshatra, setNakshatra] = useState('');
  const [rashi, setRashi] = useState('');
  const [occasion, setOccasion] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [additionalBeneficiaries, setAdditionalBeneficiaries] = useState('');
  const [remoteParticipation, setRemoteParticipation] = useState(false);
  const [priestPreference, setPriestPreference] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(() =>
    defaultPaymentProvider(Currency.USD, channel),
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const getPayer = useCallback(
    () => ({
      name: sponsorName || user?.name,
      email: user?.email,
    }),
    [sponsorName, user],
  );
  const { gate: livePaymentGate, livePaymentModal } = useLivePaymentGate(getPayer);

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

  const availableSlots = useMemo(
    () => (slotsData?.slots ?? []).filter((s) => s.available),
    [slotsData?.slots],
  );

  useEffect(() => {
    if (!services?.length || serviceId) return;
    setServiceId(services[0].id);
  }, [services, serviceId]);

  useEffect(() => {
    if (!user?.devoteeId) return;
    const ep = createEndpoints(api);
    ep.getDevotee(user.devoteeId)
      .then((d) => {
        setGotram(d.gotram ?? '');
        setNakshatra(d.nakshatra ?? '');
        setRashi(d.rashi ?? '');
        if (!sponsorName && d.firstName) {
          setSponsorName(`${d.firstName} ${d.lastName}`.trim());
        }
      })
      .catch(() => {
        /* profile optional */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, user?.devoteeId]);

  useEffect(() => {
    if (selectedService) {
      setPaymentProvider(defaultPaymentProvider(selectedService.currency, channel));
    }
  }, [selectedService, channel]);

  useEffect(() => {
    setSlot('');
  }, [serviceId, date]);

  async function handleBook() {
    if (!user?.devoteeId || !serviceId || !slot) {
      setMessage('Select a service, date, and time slot.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const ep = createEndpoints(api);
      const scheduledAt = slotToScheduledAt(date, slot);
      const svc = selectedService;
      if (!svc) return;

      const paymentSessionId = await checkoutAndPay(
        ep,
        {
          amount: svc.price,
          currency: svc.currency,
          purpose: `Seva: ${svc.name}`,
          devoteeId: user.devoteeId,
          provider: paymentProvider,
        },
        livePaymentGate,
      );

      const booking = await ep.createBooking({
        devoteeId: user.devoteeId,
        serviceId,
        scheduledAt,
        channel,
        paymentSessionId,
        priestPreference: priestPreference || undefined,
        remoteParticipation: remoteParticipation || undefined,
        additionalBeneficiaries: additionalBeneficiaries || undefined,
        sankalpa: {
          sponsorName: sponsorName || user.name,
          gotram: gotram || undefined,
          nakshatra: nakshatra || undefined,
          rashi: rashi || undefined,
          occasion: occasion || undefined,
          beneficiaryName: beneficiaryName || undefined,
          additionalBeneficiaries: additionalBeneficiaries || undefined,
          remoteParticipation: remoteParticipation || undefined,
        },
      });
      setLastBookingId(booking.id);
      setMessage(`Booking confirmed · Receipt ${booking.receiptNumber ?? booking.id.slice(0, 8)}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  const scheduleReady = Boolean(serviceId && date);
  const canSubmit = Boolean(user?.devoteeId && serviceId && slot && selectedService);

  return (
    <>
      <PageIntro
        subtitle={kioskT?.bookSevaPageSubtitle ?? `Book a seva at ${site.name}`}
        actions={<PaymentModeBadge />}
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.layout}>
        <div className={styles.workflow}>
          <GlassCard title="Service & schedule" className={styles.serviceCard}>
            <div className="formGroup">
              <label htmlFor="service">Seva</label>
              <select
                id="service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Select a service…</option>
                {(services ?? []).map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} — {formatMoney(svc.price, svc.currency ?? Currency.USD)}
                  </option>
                ))}
              </select>
            </div>
            {selectedService && (
              <div className={styles.serviceSummary}>
                <span>
                  <strong>{selectedService.name}</strong> · {selectedService.deity}
                </span>
                <span className={styles.price}>
                  {formatMoney(selectedService.price, selectedService.currency ?? Currency.USD)}
                </span>
              </div>
            )}

            <div className={styles.scheduleCompact}>
              <div className="formGroup">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!serviceId}
                />
              </div>
              <div className={styles.slotSection}>
                <p className={styles.hint}>Time</p>
                {!scheduleReady && <p className={styles.hint}>Pick a service first.</p>}
                {scheduleReady && slotsLoading && <p className={styles.hint}>Loading…</p>}
                {scheduleReady && !slotsLoading && availableSlots.length === 0 && (
                  <p className={styles.hint}>No slots — try another date.</p>
                )}
                {scheduleReady && !slotsLoading && availableSlots.length > 0 && (
                  <div className={styles.slotGrid}>
                    {availableSlots.map((s) => (
                      <button
                        key={s.startTime}
                        type="button"
                        className={`${styles.slot} ${slot === s.startTime ? styles.slotActive : ''}`}
                        onClick={() => setSlot(s.startTime)}
                      >
                        {formatSlotLabel(s.startTime)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Sankalpa" className={styles.sankalpaCard}>
            <div className={styles.sankalpaGrid}>
              <div className={`formGroup ${styles.spanFull}`}>
                <label htmlFor="sponsor">Sponsor name</label>
                <input
                  id="sponsor"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                />
              </div>
              <RitualSelect
                id="gotram"
                field="gotram"
                label="Gotram"
                value={gotram}
                onChange={setGotram}
              />
              <RitualSelect
                id="nakshatra"
                field="nakshatra"
                label="Nakshatra"
                value={nakshatra}
                onChange={setNakshatra}
              />
              <div className={`formGroup ${styles.spanFull}`}>
                <label htmlFor="occasion">Occasion</label>
                <input
                  id="occasion"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="Birthday, anniversary, health…"
                />
              </div>
            </div>

            <details className={styles.moreDetails}>
              <summary>Additional details (optional)</summary>
              <div className={styles.moreFields}>
                <div className="formGroup">
                  <label htmlFor="rashi">Rashi</label>
                  <input
                    id="rashi"
                    value={rashi}
                    onChange={(e) => setRashi(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="beneficiary">Beneficiary</label>
                  <input
                    id="beneficiary"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="If for someone else"
                  />
                </div>
                <div className={`formGroup ${styles.spanFull}`}>
                  <label htmlFor="additionalBeneficiaries">Other names</label>
                  <input
                    id="additionalBeneficiaries"
                    value={additionalBeneficiaries}
                    onChange={(e) => setAdditionalBeneficiaries(e.target.value)}
                    placeholder="Comma-separated"
                  />
                </div>
                <div className={`formGroup ${styles.spanFull}`}>
                  <label htmlFor="priestPreference">Priest preference</label>
                  <input
                    id="priestPreference"
                    value={priestPreference}
                    onChange={(e) => setPriestPreference(e.target.value)}
                    placeholder="Language or priest name"
                  />
                </div>
                <div className={`formGroup ${styles.spanFull}`}>
                  <label className="flexRow" style={{ gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={remoteParticipation}
                      onChange={(e) => setRemoteParticipation(e.target.checked)}
                    />
                    Participating remotely (live stream)
                  </label>
                </div>
              </div>
            </details>
          </GlassCard>

          <div className={styles.checkout}>
            <h4 className={styles.checkoutTitle}>Checkout</h4>
            {selectedService ? (
              <>
                <div className={styles.checkoutTotal}>
                  <span>
                    {selectedService.name}
                    {slot ? ` · ${formatSlotLabel(slot)}` : ''}
                  </span>
                  <strong>
                    {formatMoney(selectedService.price, selectedService.currency ?? Currency.USD)}
                  </strong>
                </div>
                <p className={styles.checkoutMeta}>
                  {date}
                  {slot ? ` at ${formatSlotLabel(slot)}` : ' — pick a time'}
                </p>
              </>
            ) : (
              <p className={styles.hint}>Select a service to continue.</p>
            )}

            {selectedService && (
              <PaymentProviderPicker
                value={paymentProvider}
                onChange={setPaymentProvider}
                currency={selectedService.currency}
                channel={channel}
              />
            )}

            <Button onClick={handleBook} disabled={submitting || !canSubmit}>
              {submitting ? 'Booking…' : 'Confirm booking'}
            </Button>

            {message && (
              <p className={`${styles.message} ${lastBookingId ? styles.messageOk : ''}`}>
                {message}
              </p>
            )}
            {lastBookingId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/devotee/receipt/booking/${lastBookingId}`, '_blank')}
              >
                Print receipt
              </Button>
            )}
          </div>
        </div>
      </div>

      {livePaymentModal}
    </>
  );
}
