'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { createClient } from '../../../lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError('Invalid email or password.');
      return;
    }
    const next = searchParams.get('next') ?? '/';
    router.push(next);
    router.refresh();
  }

  return (
    <div className="auth-screen">
      <div className="auth-ghosts">
        <div className="w-64 h-64 bg-red-900 rounded-sm opacity-20 blur-[80px] animate-drift-slow absolute top-10 left-[10%]"></div>
        <div className="w-80 h-80 bg-blue-900 rounded-sm opacity-20 blur-[100px] animate-drift-slower absolute bottom-10 right-[10%]"></div>
        <div className="w-72 h-72 bg-purple-900 rounded-sm opacity-20 blur-[90px] animate-drift-slow absolute top-[40%] left-[60%]" style={{ animationDirection: 'reverse' }}></div>
      </div>
      <div className="auth-card">
        <div className="auth-logo">VINYL</div>
        <div>
          <h1 className="auth-heading">Welcome back</h1>
          <p className="auth-subheading">Enter your details to sign in.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="auth-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          <Link href="/forgot-password" className="auth-link">Forgot your password?</Link>
        </p>
        <p className="auth-footer" style={{ marginTop: '-0.5rem' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="auth-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
