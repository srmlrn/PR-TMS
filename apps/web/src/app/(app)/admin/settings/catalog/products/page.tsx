'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, GlassCard, PageHeader } from '@tms/ui';
import {
  Currency,
  type CreatePosProductInput,
  type PosProduct,
  type UpdatePosProductInput,
} from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { formatMoney } from '@/lib/api/endpoints';
import styles from '../../settings.module.css';

const emptyForm = (): CreatePosProductInput => ({
  name: '',
  price: 5,
  currency: Currency.USD,
  isActive: true,
});

export default function PosProductsSettingsPage() {
  const { api } = useTenant();
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [form, setForm] = useState<CreatePosProductInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PosProduct[]>('/settings/catalog/products');
      setProducts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(product: PosProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: product.price,
      currency: product.currency,
      isActive: product.isActive,
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
        const body: UpdatePosProductInput = { ...form };
        await api.patch<PosProduct>(`/settings/catalog/products/${editingId}`, body);
      } else {
        await api.post<PosProduct>('/settings/catalog/products', form);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: PosProduct) {
    try {
      await api.patch<PosProduct>(`/settings/catalog/products/${product.id}`, {
        isActive: !product.isActive,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update product');
    }
  }

  return (
    <div>
      <PageHeader
        title="Counter Products"
        subtitle="Prasadam and article sales at the front desk POS — replaces the static catalog"
        actions={
          <Link href="/admin/settings">
            <Button variant="glass">← Settings</Button>
          </Link>
        }
      />

      {error && (
        <GlassCard className={styles.errorCard}>
          <p>{error}</p>
        </GlassCard>
      )}

      <GlassCard title={editingId ? 'Edit Product' : 'Add Product'} className={styles.configCard}>
        <div className={styles.configGrid}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active (visible at counter)
          </label>
        </div>
        <div className={styles.rowActions}>
          <Button variant="primary" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Product' : 'Add Product'}
          </Button>
          {editingId && (
            <Button variant="glass" onClick={resetForm}>
              Cancel edit
            </Button>
          )}
        </div>
      </GlassCard>

      <GlassCard title="Product List" className={styles.configCard}>
        {loading && <p className={styles.muted}>Loading…</p>}
        {!loading && products.length === 0 && (
          <p className={styles.muted}>No products — seed defaults appear on first API start in memory mode.</p>
        )}
        {!loading && products.length > 0 && (
          <table className={styles.catalogTable}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{formatMoney(p.price, p.currency)}</td>
                  <td>
                    <Badge variant={p.isActive ? 'ok' : 'pending'}>
                      {p.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Button size="sm" variant="glass" onClick={() => startEdit(p)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void toggleActive(p)}>
                        {p.isActive ? 'Deactivate' : 'Activate'}
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
