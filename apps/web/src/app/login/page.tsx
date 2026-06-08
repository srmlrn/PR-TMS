'use client';

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getTenantBranding, type TenantBranding } from '@tms/types';
import { Button, GlassCard } from '@tms/ui';
import { PublicThemeBar } from '@/components/PublicThemeBar';
import { TenantPicker } from '@/components/TenantPicker';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { getLandingRoles } from '@/lib/landing-roles';
import { getDefaultHrefForRole } from '@/lib/route-access';
import type { AppRole } from '@/lib/roles';
import { getDefaultTenantId, readSelectedTenantId, writeSelectedTenantId } from '@/lib/tenant-selection';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const tenantParam = searchParams.get('tenant');
  const [tenantId, setTenantId] = useState(() => tenantParam ?? getDefaultTenantId());
  const tenant = getTenantBranding(tenantId);
  const landingRoles = getLandingRoles(tenantId);

  useEffect(() => {
    if (!tenantParam) {
      setTenantId(readSelectedTenantId());
    }
  }, [tenantParam]);

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get('redirect');
  const roleHint = searchParams.get('role') as AppRole | null;

  useEffect(() => {
    if (tenantParam) {
      setTenantId(tenantParam);
      writeSelectedTenantId(tenantParam);
    }
  }, [tenantParam]);

  const pickTenant = useCallback(
    (next: TenantBranding) => {
      setTenantId(next.id);
      writeSelectedTenantId(next.id);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tenant', next.id);
      router.replace(`/login?${params.toString()}`);
    },
    [router, searchParams],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password, tenantId);
      const target =
        redirect && redirect !== '/login'
          ? redirect
          : getDefaultHrefForRole(roleHint ?? user.role);
      router.replace(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage compactUi">
      <PublicThemeBar />
      <TenantPicker tenantId={tenantId} onSelect={pickTenant} />
      <div className="loginHero">
        {tenant.logoSrc ? (
          <div
            className="templeLogoFrame"
            style={tenant.logoBg ? { ['--tenant-logo-bg' as string]: tenant.logoBg } : undefined}
          >
            <Image
              src={tenant.logoSrc}
              alt={`${tenant.name} logo`}
              width={296}
              height={58}
              style={{ height: '2.75rem', width: 'auto', maxWidth: 'min(18rem, 90vw)' }}
              priority
            />
          </div>
        ) : (
          <span className="landingIcon" aria-hidden>
            {tenant.icon}
          </span>
        )}
        <h1 className="landingTitle">
          <span className="landingShine">Sign in</span>
        </h1>
        <p className="landingSub">
          {tenant.deity} · {tenant.location}
        </p>
      </div>

      <GlassCard title={tenant.name} className="loginCard">
        <form onSubmit={handleSubmit} className="loginForm">
          <div className="formGroup">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="formGroup">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="loginError">{error}</p>}
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="loginHint tms-t3">
          Demo password for all roles: <strong>demo123</strong>
        </p>
      </GlassCard>

      <div className="loginRoles">
        {landingRoles.map((role) => (
          <button
            key={role.role}
            type="button"
            className="roleCard loginRoleCard"
            onClick={() => {
              setEmail(role.loginEmail);
              setPassword('demo123');
            }}
          >
            <span className="roleEmoji" aria-hidden>
              {role.emoji}
            </span>
            <h3 className="roleTitle">{role.title}</h3>
            <p className="roleDesc">{role.loginEmail}</p>
          </button>
        ))}
      </div>

      <Link href="/" className="loginBack tms-t3">
        ← Back to landing
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="authLoading">
            <span className="landingIcon" aria-hidden>
              🛕
            </span>
            <p className="tms-t2">Loading…</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthProvider>
  );
}
