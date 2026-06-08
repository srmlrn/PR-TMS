'use client';

import Image from 'next/image';
import { type TenantBranding } from '@tms/types';
import { SELECTABLE_TENANTS } from '@/lib/tenant-selection';
import styles from '@/app/landing.module.css';

export function TenantPicker({
  tenantId,
  onSelect,
}: {
  tenantId: string;
  onSelect: (tenant: TenantBranding) => void;
}) {
  return (
    <div className={styles.tenantPicker}>
      {SELECTABLE_TENANTS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`${styles.tenantChip}${t.id === tenantId ? ` ${styles.tenantChipActive}` : ''}`}
          onClick={() => onSelect(t)}
        >
          {t.logoSrc ? (
            <span
              className={styles.tenantLogoWrap}
              style={t.logoBg ? { ['--tenant-logo-bg' as string]: t.logoBg } : undefined}
            >
              <Image
                src={t.logoSrc}
                alt=""
                width={148}
                height={29}
                className={styles.tenantLogo}
              />
            </span>
          ) : (
            <span className={styles.tenantChipIcon} aria-hidden>
              {t.icon}
            </span>
          )}
          <span className={styles.tenantChipName}>{t.name}</span>
        </button>
      ))}
    </div>
  );
}
