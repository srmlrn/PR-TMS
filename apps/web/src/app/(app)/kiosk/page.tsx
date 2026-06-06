'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@tms/ui';
import {
  KIOSK_LANGUAGES,
  kioskStrings,
  persistKioskLang,
  readKioskLang,
  type KioskLang,
} from '@/lib/kiosk-i18n';
import { PublicThemeBar } from '@/components/PublicThemeBar';
import styles from './kiosk.module.css';

export default function KioskPage() {
  const router = useRouter();
  const [lang, setLang] = useState<KioskLang>('en');

  useEffect(() => {
    setLang(readKioskLang());
  }, []);

  useEffect(() => {
    persistKioskLang(lang);
  }, [lang]);

  const t = kioskStrings(lang);

  function nav(path: string) {
    const sep = path.includes('?') ? '&' : '?';
    router.push(`${path}${sep}channel=kiosk&lang=${lang}`);
  }

  return (
    <div className={styles.wrap}>
      <PublicThemeBar />
      <h1 className={styles.title}>🛕 {t.welcome}</h1>
      <p className={styles.sub}>{t.subtitle}</p>

      <div className={styles.langRow} role="group" aria-label={t.language}>
        {KIOSK_LANGUAGES.map((l) => (
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
          {t.bookSeva}
        </button>
        <button type="button" className={styles.tile} onClick={() => nav('/devotee/donate')}>
          <span aria-hidden>💝</span>
          {t.donate}
        </button>
        <button type="button" className={styles.tile} onClick={() => router.push('/frontdesk/console')}>
          <span aria-hidden>🎫</span>
          {t.darshanToken}
        </button>
        <button type="button" className={styles.tile} onClick={() => nav('/devotee/home')}>
          <span aria-hidden>📄</span>
          {t.myAccount}
        </button>
      </div>

      <Button variant="outline" className={styles.exit} onClick={() => router.push('/login')}>
        {t.staffSignIn}
      </Button>
    </div>
  );
}
