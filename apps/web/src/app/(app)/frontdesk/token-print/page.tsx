'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@tms/ui';
import { PublicThemeBar } from '@/components/PublicThemeBar';
import styles from './token-print.module.css';

export default function TokenPrintPage() {
  const router = useRouter();
  const params = useSearchParams();

  const tokenNumber = params.get('token') ?? '—';
  const position = params.get('position') ?? '—';
  const wait = params.get('wait') ?? '—';
  const name = params.get('name') ?? 'Guest';

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={styles.page}>
      <PublicThemeBar />
      <article className={styles.ticket}>
        <header className={styles.header}>
          <span aria-hidden>🛕</span>
          <h1>Sri Venkateswara Temple</h1>
          <p>Darshan Queue Token</p>
        </header>

        <div className={styles.tokenNumber}>{tokenNumber}</div>

        <dl className={styles.details}>
          <div>
            <dt>Devotee</dt>
            <dd>{decodeURIComponent(name)}</dd>
          </div>
          <div>
            <dt>Position in queue</dt>
            <dd>{position}</dd>
          </div>
          <div>
            <dt>Estimated wait</dt>
            <dd>~{wait} min</dd>
          </div>
          <div>
            <dt>Issued</dt>
            <dd>{new Date().toLocaleString()}</dd>
          </div>
        </dl>

        <p className={styles.footer}>Please keep this token until called. Thank you.</p>
      </article>

      <div className={styles.actions}>
        <Button onClick={() => window.print()}>Print again</Button>
        <Button variant="outline" onClick={() => router.push('/frontdesk/console')}>
          Back to console
        </Button>
      </div>
    </div>
  );
}
