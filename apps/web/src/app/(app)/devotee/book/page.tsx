'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, GlassCard, PageHeader, Chip } from '@tms/ui';
import { Currency, type PaymentProvider } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { formatMoney } from '@/lib/api/endpoints';
import { ApiBanner } from '@/components/ApiBanner';
import { PaymentModeBadge } from '@/components/PaymentModeBadge';
import { PaymentProviderPicker } from '@/components/PaymentProviderPicker';
import { useLivePaymentGate } from '@/hooks/use-live-payment-gate';
import { checkoutAndPay, defaultPaymentProvider } from '@/lib/payment-flow';
import { kioskStrings, parseKioskLang } from '@/lib/kiosk-i18n';
import styles from './book.module.css';

export default function BookSevaPage() {
  const { user } = useAuth();
  const { api } = useTenant();
  const searchParams = useSearchParams();
  const channel = (searchParams.get('channel') as 'app' | 'kiosk' | 'counter') ?? 'app';
  const kioskLang = channel === 'kiosk' ? parseKioskLang(searchParams.get('lang')) : null;
  const kioskT = kioskLang ? kioskStrings(kioskLang) : null;
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState('');
  const [sponsorName, setSponsorName] = useState(user?.name ?? '');
  const [gotram, setGotram] = useState('');
  const [nakshatra, setNakshatra] = useState('');
  const [rashi, setRashi] = useState('');
  const [occasion, setOccasion] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
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

  useEffect(() => {
    if (selectedService) {
      setPaymentProvider(defaultPaymentProvider(selectedService.currency, channel));
    }
  }, [selectedService, channel]);

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
        sankalpa: sponsorName
          ? {
              sponsorName,
              gotram: gotram || undefined,
              nakshatra: nakshatra || undefined,
              rashi: rashi || undefined,
              occasion: occasion || undefined,
              beneficiaryName: beneficiaryName || undefined,
            }
          : undefined,
      });
      setLastBookingId(booking.id);
      setMessage(`Booking confirmed! Receipt ${booking.receiptNumber ?? booking.id.slice(0, 8)}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={kioskT?.bookSevaPageTitle ?? 'Book Seva'}
        subtitle={kioskT?.bookSevaPageSubtitle ?? 'Select a service, date, and sankalpa details'}
        actions={<PaymentModeBadge />}
      />
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
              <label htmlFor="gotram">Gotram *</label>
              <input id="gotram" value={gotram} onChange={(e) => setGotram(e.target.value)} required />
            </div>
            <div className="formGroup">
              <label htmlFor="nakshatra">Nakshatra (star)</label>
              <input
                id="nakshatra"
                value={nakshatra}
                onChange={(e) => setNakshatra(e.target.value)}
                placeholder="Rohini — or leave blank if unknown"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="rashi">Rashi</label>
              <input
                id="rashi"
                value={rashi}
                onChange={(e) => setRashi(e.target.value)}
                placeholder="Vrishabha — optional"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="occasion">Occasion / purpose</label>
              <input
                id="occasion"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="Birthday, anniversary, health…"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="beneficiary">Beneficiary name</label>
              <input
                id="beneficiary"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="If offering for someone else"
              />
            </div>
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="priestPreference">Priest preference</label>
              <input
                id="priestPreference"
                value={priestPreference}
                onChange={(e) => setPriestPreference(e.target.value)}
                placeholder="Preferred priest name or language, if any"
              />
            </div>
          </div>
          {selectedService && (
            <>
              <p className="tms-t2 mt1">
                Total: {formatMoney(selectedService.price, selectedService.currency)}
              </p>
              <PaymentProviderPicker
                value={paymentProvider}
                onChange={setPaymentProvider}
                currency={selectedService.currency}
                channel={channel}
              />
            </>
          )}
          <Button onClick={handleBook} disabled={submitting} className="mt1">
            {submitting ? 'Booking…' : 'Confirm Booking'}
          </Button>
          {message && <p className="tms-t2 mt1">{message}</p>}
          {lastBookingId && (
            <Button
              variant="outline"
              size="sm"
              className="mt1"
              onClick={() => window.open(`/devotee/receipt/booking/${lastBookingId}`, '_blank')}
            >
              Print receipt
            </Button>
          )}
        </GlassCard>
      </div>

      {livePaymentModal}
    </>
  );
}
