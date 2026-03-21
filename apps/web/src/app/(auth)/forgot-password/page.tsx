'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';

import { createClient } from '../../../lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://vinyl-web-one.vercel.app/update-password',
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">VINYL</div>
        <h1 className="auth-heading">Reset your password</h1>
        <p className="auth-subheading">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {sent ? (
          <p className="auth-success">
            Check your inbox — we sent a reset link to <strong>{email}</strong>.
          </p>
        ) : (
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

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={loading || !email}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link href="/login" className="auth-link">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
