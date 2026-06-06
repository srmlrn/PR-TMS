'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, GlassCard } from '@tms/ui';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { getDefaultHrefForRole } from '@/lib/route-access';
import { LANDING_ROLES, type AppRole } from '@/lib/roles';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get('redirect');
  const roleHint = searchParams.get('role') as AppRole | null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
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
    <div className="loginPage">
      <div className="loginHero">
        <span className="landingIcon" aria-hidden>
          🛕
        </span>
        <h1 className="landingTitle">
          <span className="landingShine">Sign in</span>
        </h1>
        <p className="landingSub">Sri Venkateswara Temple · Demo tenant</p>
      </div>

      <GlassCard title="Temple Management System" className="loginCard">
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
        {LANDING_ROLES.map((role) => (
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
      <LoginForm />
    </AuthProvider>
  );
}
