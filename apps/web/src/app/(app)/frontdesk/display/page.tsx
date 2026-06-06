'use client';

import { useEffect, useState } from 'react';
import type { NowServing, QueueToken } from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import styles from './display.module.css';

export default function FrontDeskDisplayPage() {
  const { api } = useTenant();
  const [serving, setServing] = useState<NowServing[]>([]);
  const [upNext, setUpNext] = useState<QueueToken[]>([]);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      );
    tick();
    const clockId = setInterval(tick, 30_000);
    return () => clearInterval(clockId);
  }, []);

  useEffect(() => {
    const ep = createEndpoints(api);
    const load = async () => {
      const [now, queue] = await Promise.all([
        ep.getNowServing(),
        ep.getFrontDeskQueue({ status: 'waiting' }),
      ]);
      setServing(now.data);
      setUpNext((queue.data ?? []).slice(0, 5));
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [api]);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1>🛕 Sri Venkateswara Temple</h1>
        <span className={styles.clock}>{clock}</span>
      </header>

      <section className={styles.now}>
        <p className={styles.label}>Now serving</p>
        {serving.length === 0 ? (
          <p className={styles.tokenPlaceholder}>—</p>
        ) : (
          serving.map((s) => (
            <div key={s.tokenNumber} className={styles.servingCard}>
              <span className={styles.token}>{s.tokenNumber}</span>
              {s.devoteeName && <span className={styles.name}>{s.devoteeName}</span>}
            </div>
          ))
        )}
      </section>

      <section className={styles.next}>
        <p className={styles.label}>Up next</p>
        <ul className={styles.nextList}>
          {upNext.map((t) => (
            <li key={t.id}>
              <strong>{t.tokenNumber}</strong>
              {t.devoteeName ? ` · ${t.devoteeName}` : ''}
              {t.priority ? ' · VIP' : ''}
            </li>
          ))}
          {upNext.length === 0 && <li className={styles.muted}>Queue empty</li>}
        </ul>
      </section>
    </div>
  );
}
