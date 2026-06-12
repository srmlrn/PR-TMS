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
    if (images.length === 0) {
      setBgReady(true);
      return;
    }
    let cancelled = false;
    let loaded = 0;
    const onDone = () => {
      loaded += 1;
      if (!cancelled && loaded >= images.length) setBgReady(true);
    };
    for (const src of images) {
      const img = new window.Image();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        onDone();
      };
      img.onload = finish;
      img.onerror = finish;
      img.src = src;
      if (img.complete) finish();
    }
    return () => {
      cancelled = true;
    };
  }, [landing?.heroImage]);

  const pickTenant = useCallback((next: TenantBranding) => {
    setTenantId(next.id);
  }, []);

  const accent = landing?.accent ?? '#e8b84a';

  return (
    <div
      className={styles.page}
      style={{ ['--landing-accent' as string]: accent }}
      data-tenant={tenant.slug}
    >
      {landing?.heroImage ? (
        <div
          className={[styles.backdrop, bgReady ? styles.backdropLoaded : ''].filter(Boolean).join(' ')}
          style={{
            backgroundImage: `url(${landing.heroImage})`,
            opacity: bgReady ? 1 : 0,
          }}
          aria-hidden
        />
      ) : null}
      <div
        className={styles.overlay}
        style={{ background: landing?.overlay ?? DEFAULT_OVERLAY }}
        aria-hidden
      />
      <div className={styles.overlayLight} aria-hidden />
      <div className={styles.veil} aria-hidden />

      <header className={styles.pageHeader}>
        <Link href={`/login?tenant=${tenantId}`} className={styles.signInLink}>
          Sign in
        </Link>
        <TenantPicker tenantId={tenantId} onSelect={pickTenant} />
        <PublicThemeBar />
      </header>

      <main className={styles.shell}>
        <section className={styles.heroCard}>
          <div className={styles.mainStage}>
            <div className={styles.welcomePanel}>
              <p className={styles.heroEyebrow}>{landing?.welcome ?? tenant.subtitle}</p>

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
                <div className={styles.brandRow}>
                  <div className={styles.medallion} aria-hidden>
                    {tenant.icon}
                  </div>
                  <div className={styles.brandCopy}>
                    <h1 className={styles.templeName}>
                      <span className={styles.templeNameShine}>{tenant.name}</span>
                    </h1>
                    <p className={styles.deityLine}>{tenant.deity}</p>
                  </div>
                </div>
              )}

              {tenant.logoSrc ? (
                <>
                  <p className={styles.deityLine}>{tenant.deity}</p>
                </>
              ) : null}

              <div className={styles.metaRow}>
                <span className={styles.metaPill}>{tenant.subtitle}</span>
                <span className={styles.metaDot} aria-hidden>
                  ·
                </span>
                <span className={styles.metaLocation}>{tenant.location}</span>
              </div>
            </div>

            {landing?.deityImage ? (
              <figure className={styles.showcase}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={landing.deityImage}
                  alt={`${tenant.deity} at ${tenant.name}`}
                  className={styles.deityArt}
                  loading="eager"
                  decoding="async"
                />
              </figure>
            ) : null}
          </div>
        </section>

        <section className={styles.workspaceDock} aria-labelledby="workspace-heading">
          <div className={styles.workspaceHead}>
            <div>
              <h2 id="workspace-heading" className={styles.prompt}>
                Choose a workspace
              </h2>
              <p className={styles.workspaceSub}>
                Select your role to sign in to {tenant.name}
              </p>
            </div>
            <p className={styles.hintInline}>
              Demo password <code>demo123</code>
            </p>
          </div>

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
        </section>
      </main>
    </div>
  );
}
