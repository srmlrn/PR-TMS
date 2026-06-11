'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getTenantBranding, type TenantBranding } from '@tms/types';
import { PublicThemeBar } from '@/components/PublicThemeBar';
import { TenantPicker } from '@/components/TenantPicker';
import { getLandingRoles, LANDING_ROLE_ORDER } from '@/lib/landing-roles';
import {
  getDefaultTenantId,
  readSelectedTenantId,
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

const DEFAULT_OVERLAY =
  'linear-gradient(105deg, rgba(8,10,18,0.92) 0%, rgba(8,10,18,0.6) 50%, rgba(4,6,12,0.9) 100%)';

export function LandingPortal() {
  const [tenantId, setTenantId] = useState(getDefaultTenantId);
  const [bgReady, setBgReady] = useState(false);
  const tenant = getTenantBranding(tenantId);
  const landing = tenant.landing;

  useEffect(() => {
    setTenantId(readSelectedTenantId());
  }, []);

  const rolesByKey = Object.fromEntries(getLandingRoles(tenantId).map((r) => [r.role, r]));
  const roles = LANDING_ROLE_ORDER.map((key) => rolesByKey[key]).filter(Boolean);

  useEffect(() => {
    writeSelectedTenantId(tenantId);
    setBgReady(false);
  }, [tenantId]);

  useEffect(() => {
    const images: string[] = [];
    if (landing?.heroImage) images.push(landing.heroImage);
    if (landing?.deityImage) images.push(landing.deityImage);
    if (images.length === 0) {
      setBgReady(true);
      return;
    }
    let loaded = 0;
    const onDone = () => {
      loaded += 1;
      if (loaded >= images.length) setBgReady(true);
    };
    for (const src of images) {
      const img = new window.Image();
      img.onload = onDone;
      img.onerror = onDone;
      img.src = src;
    }
  }, [landing?.heroImage, landing?.deityImage]);

  const pickTenant = useCallback((next: TenantBranding) => {
    setTenantId(next.id);
  }, []);

  const accent = landing?.accent ?? '#e8b84a';

  return (
    <div
      className={`${styles.page} compactUi`}
      style={{ ['--landing-accent' as string]: accent }}
      data-tenant={tenant.slug}
    >
      <div
        className={[styles.backdrop, bgReady ? styles.backdropLoaded : ''].filter(Boolean).join(' ')}
        style={{
          backgroundImage: landing?.heroImage ? `url(${landing.heroImage})` : undefined,
          opacity: bgReady ? 1 : 0,
        }}
        aria-hidden
      />
      <div
        className={styles.overlay}
        style={{ background: landing?.overlay ?? DEFAULT_OVERLAY }}
        aria-hidden
      />
      <div className={styles.veil} aria-hidden />

      <Link href={`/login?tenant=${tenantId}`} className={styles.signInLink}>
        Sign in
      </Link>
      <PublicThemeBar />

      <main className={styles.shell}>
        <TenantPicker tenantId={tenantId} onSelect={pickTenant} />

        <div className={styles.heroLayout}>
          <section className={styles.hero}>
            <p className={styles.heroEyebrow}>{landing?.welcome ?? tenant.subtitle}</p>

            <div className={styles.deityBadge}>
              <span className={styles.deityIcon} aria-hidden>
                {tenant.icon}
              </span>
              <span>{tenant.deity}</span>
            </div>

            {tenant.logoSrc ? (
              <div
                className={styles.logoFrame}
                style={tenant.logoBg ? { ['--tenant-logo-bg' as string]: tenant.logoBg } : undefined}
              >
                <Image
                  src={tenant.logoSrc}
                  alt={`${tenant.name} logo`}
                  width={320}
                  height={64}
                  className={styles.medallionLogo}
                  priority
                />
              </div>
            ) : (
              <>
                <div className={styles.medallion} aria-hidden>
                  {tenant.icon}
                </div>
                <h1 className={styles.templeName}>
                  <span className={styles.templeNameShine}>{tenant.name}</span>
                </h1>
              </>
            )}

            {tenant.logoSrc && (
              <h1 className={styles.templeName}>
                <span className={styles.templeNameShine}>{tenant.name}</span>
              </h1>
            )}

            <p className={styles.tagline}>{tenant.subtitle}</p>
            <p className={styles.location}>{tenant.location}</p>
          </section>

          {landing?.deityImage ? (
            <div
              className={[styles.deityCol, bgReady ? styles.deityColReady : ''].filter(Boolean).join(' ')}
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={landing.deityImage}
                alt=""
                className={styles.deityArt}
                width={480}
                height={640}
              />
            </div>
          ) : null}

          <section className={styles.workspace}>
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
          </section>
        </div>
      </main>
    </div>
  );
}
