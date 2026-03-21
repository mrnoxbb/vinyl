'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClient } from '../../lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // Supabase automatically exchanges the token from the URL hash on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true);
      }
    });
    // Also check if already has a valid session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
      else setSessionReady(prev => prev ?? false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/'), 2000);
  }

  // Still detecting session
  if (sessionReady === null) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo">VINYL</div>
          <p className="auth-subheading">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  // Invalid / expired token
  if (sessionReady === false) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo">VINYL</div>
          <h1 className="auth-heading">Link expired</h1>
          <p className="auth-subheading" style={{ color: '#E24B4A' }}>
            This reset link has expired or already been used.
          </p>
          <p className="auth-footer">
            <Link href="/forgot-password" className="auth-link">Request a new reset link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">VINYL</div>
        <h1 className="auth-heading">Set a new password</h1>
        <p className="auth-subheading">Choose a strong password for your account</p>

        {success ? (
          <p className="auth-success">
            Password updated successfully. Redirecting…
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">New password</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="confirm">Confirm new password</label>
              <input
                id="confirm"
                className="auth-input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
              />
              {confirm && password !== confirm && (
                <p className="auth-error">Passwords do not match.</p>
              )}
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading || !password || !confirm}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  Updating…
                </span>
              ) : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
