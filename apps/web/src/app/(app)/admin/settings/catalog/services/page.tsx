'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, GlassCard } from '@tms/ui';
import {
  Currency,
  type CreateSevaServiceInput,
  type SevaService,
  type UpdateSevaServiceInput,
} from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { useTenant } from '@/lib/tenant-context';
import { formatMoney } from '@/lib/api/endpoints';
import styles from '../../settings.module.css';

const emptyForm = (): CreateSevaServiceInput => ({
  name: '',
  deity: '',
  description: '',
  price: 25,
  currency: Currency.USD,
  durationMinutes: 30,
  isActive: true,
});

export default function SevaCatalogSettingsPage() {
  const { api } = useTenant();
  const [services, setServices] = useState<SevaService[]>([]);
  const [form, setForm] = useState<CreateSevaServiceInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SevaService[]>('/settings/catalog/services');
      setServices(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load seva catalog');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(service: SevaService) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      deity: service.deity,
      description: service.description ?? '',
      price: service.price,
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const body: UpdateSevaServiceInput = { ...form };
        await api.patch<SevaService>(`/settings/catalog/services/${editingId}`, body);
      } else {
        await api.post<SevaService>('/settings/catalog/services', form);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save service');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service: SevaService) {
    try {
      await api.patch<SevaService>(`/settings/catalog/services/${service.id}`, {
        isActive: !service.isActive,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update service');
    }
  }

  return (
    <div>
      <PageIntro
        subtitle="Poojas and services — prices flow to devotee booking, counter POS, and priest schedule"
        actions={
          <Link href="/admin/settings">
            <Button variant="glass">← Settings</Button>
          </Link>
        }
        showTenantContext={false}
      />

      {error && (
        <GlassCard className={styles.errorCard}>
          <p>{error}</p>
        </GlassCard>
      )}

      <GlassCard title={editingId ? 'Edit Service' : 'Add Service'} className={styles.configCard}>
        <div className={styles.configGrid}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            Deity / sannidhi
            <input
              value={form.deity}
              onChange={(e) => setForm((f) => ({ ...f, deity: e.target.value }))}
            />
          </label>
          <label>
            Price
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            />
          </label>
          <label>
            Duration (min)
            <input
              type="number"
              min={5}
              value={form.durationMinutes ?? 30}
              onChange={(e) =>
                setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))
              }
            />
          </label>
          <label className={styles.fullWidth}>
            Description
            <input
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active (visible for booking)
          </label>
        </div>
        <div className={styles.rowActions}>
          <Button variant="primary" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Service' : 'Add Service'}
          </Button>
          {editingId && (
            <Button variant="glass" onClick={resetForm}>
              Cancel edit
            </Button>
          )}
        </div>
      </GlassCard>

      <GlassCard title="Catalog" className={styles.configCard}>
        {loading && <p className={styles.muted}>Loading…</p>}
        {!loading && services.length === 0 && (
          <p className={styles.muted}>No services yet — add your first pooja above.</p>
        )}
        {!loading && services.length > 0 && (
          <table className={styles.catalogTable}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Deity</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    {s.description && (
                      <div className={styles.muted}>{s.description}</div>
                    )}
                  </td>
                  <td>{s.deity}</td>
                  <td>{formatMoney(s.price, s.currency)}</td>
                  <td>{s.durationMinutes} min</td>
                  <td>
                    <Badge variant={s.isActive ? 'ok' : 'pending'}>
                      {s.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Button size="sm" variant="glass" onClick={() => startEdit(s)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void toggleActive(s)}>
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
    </div>
  );
}
