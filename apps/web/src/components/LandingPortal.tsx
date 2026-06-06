'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  getTenantBranding,
  type TenantBranding,
} from '@tms/types';
import { PublicThemeBar } from '@/components/PublicThemeBar';
import { getLandingRoles, LANDING_ROLE_ORDER } from '@/lib/landing-roles';
import {
  readSelectedTenantId,
  SELECTABLE_TENANTS,
  writeSelectedTenantId,
} from '@/lib/tenant-selection';
import styles from '@/app/landing.module.css';

function loginHref(email: string, role: string, tenantId: string) {
  const params = new URLSearchParams({
    email,
    role,
    tenant: tenantId,
  });
  return `/login?${params.toString()}`;
}

export function LandingPortal() {
  const [tenantId, setTenantId] = useState(readSelectedTenantId);
  const tenant = getTenantBranding(tenantId);
  const rolesByKey = Object.fromEntries(getLandingRoles(tenantId).map((r) => [r.role, r]));
  const roles = LANDING_ROLE_ORDER.map((key) => rolesByKey[key]).filter(Boolean);

  useEffect(() => {
    writeSelectedTenantId(tenantId);
  }, [tenantId]);

  const pickTenant = useCallback((next: TenantBranding) => {
    setTenantId(next.id);
  }, []);

  return (
    <div className={`${styles.page} compactUi`}>
      <Link href={`/login?tenant=${tenantId}`} className={styles.signInLink}>
        Sign in
      </Link>
      <PublicThemeBar />

      <main className={styles.portal}>
        <div className={styles.tenantPicker}>
          {SELECTABLE_TENANTS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tenantChip}${t.id === tenantId ? ` ${styles.tenantChipActive}` : ''}`}
              onClick={() => pickTenant(t)}
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

        <div className={styles.brand}>
          {tenant.logoSrc ? (
            <div
              className={styles.logoFrame}
              style={tenant.logoBg ? { ['--tenant-logo-bg' as string]: tenant.logoBg } : undefined}
              aria-hidden
            >
              <Image
                src={tenant.logoSrc}
                alt={`${tenant.name} logo`}
                width={296}
                height={58}
                className={styles.medallionLogo}
                priority
              />
            </div>
          ) : (
            <div className={styles.medallion} aria-hidden>
              {tenant.icon}
            </div>
          )}
          {!tenant.logoSrc && <h1 className={styles.templeName}>{tenant.name}</h1>}
          <p className={styles.tagline}>{tenant.subtitle}</p>
        </div>

        <p className={styles.prompt}>Choose a workspace</p>

        <div className={styles.grid}>
          {roles.map((role) => (
            <Link
              key={`${tenantId}-${role.role}`}
              href={loginHref(role.loginEmail, role.role, tenantId)}
              className={styles.tile}
            >
              <span className={styles.tileEmoji} aria-hidden>
                {role.emoji}
              </span>
              <span className={styles.tileLabel}>{role.title}</span>
            </Link>
          ))}
        </div>

        <p className={styles.hint}>
          Tap a role · password <code>demo123</code>
        </p>
      </main>
    </div>
  );
}
