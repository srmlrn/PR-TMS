'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@tms/ui';
import styles from './kiosk.module.css';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिन्दी' },
] as const;

type LangCode = (typeof LANGUAGES)[number]['code'];

export default function KioskPage() {
  const router = useRouter();
  const [lang, setLang] = useState<LangCode>('en');

  function nav(path: string) {
    const sep = path.includes('?') ? '&' : '?';
    router.push(`${path}${sep}channel=kiosk&lang=${lang}`);
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>🛕 Welcome</h1>
      <p className={styles.sub}>Sri Venkateswara Temple · Self-Service</p>

      <div className={styles.langRow} role="group" aria-label="Language">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`${styles.langBtn} ${lang === l.code ? styles.langBtnActive : ''}`}
            onClick={() => setLang(l.code)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        <button type="button" className={styles.tile} onClick={() => nav('/devotee/book')}>
          <span aria-hidden>🙏</span>
          Book Seva
        </button>
        <button type="button" className={styles.tile} onClick={() => nav('/devotee/donate')}>
          <span aria-hidden>💝</span>
          Donate
        </button>
        <button type="button" className={styles.tile} onClick={() => router.push('/frontdesk/console')}>
          <span aria-hidden>🎫</span>
          Darshan Token
        </button>
        <button type="button" className={styles.tile} onClick={() => nav('/devotee/home')}>
          <span aria-hidden>📄</span>
          My Account
        </button>
      </div>

      <Button variant="outline" className={styles.exit} onClick={() => router.push('/login')}>
        Staff sign in
      </Button>
    </div>
  );
}
