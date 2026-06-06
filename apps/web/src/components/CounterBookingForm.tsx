'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@tms/ui';
import type { Currency, DevoteeLookupResult, PaymentProvider, SevaService } from '@tms/types';
import type { Endpoints } from '@/lib/api/endpoints';
import { formatMoney } from '@/lib/api/endpoints';
import { PaymentProviderPicker } from '@/components/PaymentProviderPicker';
import { checkoutAndPay, defaultPaymentProvider } from '@/lib/payment-flow';

interface Props {
  ep: Endpoints;
  devotee: NonNullable<DevoteeLookupResult['devotee']>;
  services: SevaService[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function CounterBookingForm({ ep, devotee, services, onSuccess, onError }: Props) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState('');
  const [gotram, setGotram] = useState(devotee.gotram ?? '');
  const [nakshatra, setNakshatra] = useState(devotee.nakshatra ?? '');
  const [occasion, setOccasion] = useState('');
  const [slots, setSlots] = useState<{ startTime: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(() =>
    defaultPaymentProvider(services[0]?.currency ?? 'USD', 'counter'),
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  useEffect(() => {
    if (serviceId && date) {
      loadSlots(serviceId, date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSlots(sid: string, d: string) {
    if (!sid || !d) return;
    setLoadingSlots(true);
    try {
      const res = await ep.getServiceSlots(sid, d);
      setSlots(res.slots.filter((s) => s.available));
      setSlot('');
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleBook() {
    if (!serviceId || !slot || !selectedService) {
      onError('Select service, date, and time slot.');
      return;
    }
    setBusy(true);
    try {
      const paymentSessionId = await checkoutAndPay(ep, {
        amount: selectedService.price,
        currency: selectedService.currency as Currency,
        purpose: `Counter: ${selectedService.name}`,
        devoteeId: devotee.id,
        provider: paymentProvider,
      });
      const scheduledAt = new Date(`${date}T${slot}`).toISOString();
      const booking = await ep.createBooking({
        devoteeId: devotee.id,
        serviceId,
        scheduledAt,
        channel: 'counter',
        paymentSessionId,
        sankalpa: {
          sponsorName: devotee.name,
          gotram: gotram || undefined,
          nakshatra: nakshatra || undefined,
          occasion: occasion || undefined,
        },
      });
      onSuccess(
        `Booked ${selectedService.name} · Receipt ${booking.receiptNumber ?? booking.id.slice(0, 8)}`,
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="formGrid" style={{ gap: '0.45rem' }}>
      <PaymentProviderPicker
        value={paymentProvider}
        onChange={setPaymentProvider}
        currency={(selectedService?.currency as Currency) ?? 'USD'}
        channel="counter"
      />
      <div className="formGroup">
        <label htmlFor="cbService">Service</label>
        <select
          id="cbService"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            loadSlots(e.target.value, date);
          }}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {formatMoney(s.price, s.currency)}
            </option>
          ))}
        </select>
      </div>
      <div className="formGroup">
        <label htmlFor="cbDate">Date</label>
        <input
          id="cbDate"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            loadSlots(serviceId, e.target.value);
          }}
        />
      </div>
      <div className="formGroup">
        <label htmlFor="cbSlot">Time slot</label>
        <select
          id="cbSlot"
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          disabled={loadingSlots}
        >
          <option value="">Select…</option>
          {slots.map((s) => (
            <option key={s.startTime} value={s.startTime}>
              {s.startTime}
            </option>
          ))}
        </select>
      </div>
      <div className="formGroup">
        <label htmlFor="cbGotram">Gotram</label>
        <input id="cbGotram" value={gotram} onChange={(e) => setGotram(e.target.value)} />
      </div>
      <div className="formGroup">
        <label htmlFor="cbNakshatra">Nakshatra</label>
        <input id="cbNakshatra" value={nakshatra} onChange={(e) => setNakshatra(e.target.value)} />
      </div>
      <div className="formGroup">
        <label htmlFor="cbOccasion">Occasion</label>
        <input id="cbOccasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} />
      </div>
      <div className="formGroup" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
        <Button size="sm" onClick={handleBook} disabled={busy}>
          {busy ? 'Booking…' : `Book & pay ${selectedService ? formatMoney(selectedService.price, selectedService.currency) : ''}`}
        </Button>
      </div>
    </div>
  );
}
