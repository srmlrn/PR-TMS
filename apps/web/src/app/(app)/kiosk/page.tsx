'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@tms/ui';
import styles from './kiosk.module.css';

export default function KioskPage() {
  const router = useRouter();

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>🛕 Welcome</h1>
      <p className={styles.sub}>Sri Venkateswara Temple · Self-Service</p>

      <div className="kioskGrid">
        <button type="button" className="kioskTile" onClick={() => router.push('/devotee/book')}>
          <span aria-hidden>🙏</span>
          Book Seva
        </button>
        <button type="button" className="kioskTile" onClick={() => router.push('/devotee/donate')}>
          <span aria-hidden>💝</span>
          Donate
        </button>
        <button
          type="button"
          className="kioskTile"
          onClick={() => router.push('/frontdesk/console')}
        >
          <span aria-hidden>🎫</span>
          Darshan Token
        </button>
        <button type="button" className="kioskTile" onClick={() => router.push('/devotee/home')}>
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
