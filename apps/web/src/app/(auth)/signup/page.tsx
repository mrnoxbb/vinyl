'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';

import { createClient } from '../../../lib/supabase/client';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  function validate() {
    const e: Record<string, string> = {};
    if (!/^[a-z0-9_]{3,20}$/.test(username))
      e.username = 'Username must be 3–20 characters: letters, numbers, underscores only.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Enter a valid email address.';
    if (password.length < 8)
      e.password = 'Password must be at least 8 characters.';
    if (password !== confirm)
      e.confirm = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError('');
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: username } },
    });
    setLoading(false);
    if (error) {
      setServerError(error.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="auth-screen">
      <div className="auth-ghosts">
        <div className="w-64 h-64 bg-red-900 rounded-sm opacity-20 blur-[80px] animate-drift-slow absolute top-10 left-[10%]"></div>
        <div className="w-80 h-80 bg-blue-900 rounded-sm opacity-20 blur-[100px] animate-drift-slower absolute bottom-10 right-[10%]"></div>
        <div className="w-72 h-72 bg-purple-900 rounded-sm opacity-20 blur-[90px] animate-drift-slow absolute top-[40%] left-[60%] border" style={{ animationDirection: 'reverse' }}></div>
      </div>
      <div className="auth-card">
        <div className="auth-logo">VINYL</div>
        <div>
          <h1 className="auth-heading">Create your account</h1>
          <p className="auth-subheading">Join the community. Let's talk about music.</p>
        </div>

        {success ? (
          <p className="auth-success text-center italic py-4">
            Check your email to confirm your account.
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="username">Username</label>
              <input
                id="username"
                className={`auth-input${errors.username ? ' auth-input-error' : ''}`}
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="yourname"
              />
              {errors.username && <span className="auth-error">{errors.username}</span>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                id="email"
                className={`auth-input${errors.email ? ' auth-input-error' : ''}`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              {errors.email && <span className="auth-error">{errors.email}</span>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                className={`auth-input${errors.password ? ' auth-input-error' : ''}`}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              {errors.password && <span className="auth-error">{errors.password}</span>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                className={`auth-input${errors.confirm ? ' auth-input-error' : ''}`}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
              />
              {errors.confirm && <span className="auth-error">{errors.confirm}</span>}
            </div>

            {serverError && <p className="auth-error">{serverError}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <p className="auth-footer" style={{ marginTop: success ? '1rem' : '0' }}>
          Already have an account?{' '}
          <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
