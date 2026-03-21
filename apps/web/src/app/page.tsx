'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

import type { Review } from '@vinyl/shared/types/review';
import { fetchGlobalFeed } from '@vinyl/shared/lib/reviews';

import { createClient } from '../lib/supabase/client';
import { ReviewCard } from '../components/ReviewCard';

// ── Landing page (logged-out) ─────────────────────────────

function LandingPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Hero */}
      <section style={{ padding: '4rem 0 3rem' }}>
        <h1 style={{ margin: '0 0 1rem', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.1, color: '#fff' }}>
          Review every song<br />you&rsquo;ve ever heard.
        </h1>
        <p style={{ margin: '0 0 2rem', fontSize: '1.1rem', color: '#a0a0a0', lineHeight: 1.7, maxWidth: 480 }}>
          The social music review platform. Rate, review, and discover music together.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            href="/signup"
            style={{ padding: '0.8rem 1.75rem', borderRadius: 8, background: '#534AB7', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}
          >
            Get started
          </Link>
          <Link
            href="/explore"
            style={{ padding: '0.8rem 1.75rem', borderRadius: 8, border: '1px solid #333', color: '#a0a0a0', fontSize: '0.95rem' }}
          >
            Browse reviews
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', paddingBottom: '3rem' }}>
        {[
          { icon: '★', title: 'Half-star ratings', body: 'Precise ratings from 0.5 to 5.0 — because music deserves nuance.' },
          { icon: '♬', title: 'Social feed',       body: 'Follow friends and see what they\'re listening to and reviewing.' },
          { icon: '✦', title: 'Community discovery', body: 'Find hidden gems and trending music reviewed by the community.' },
        ].map((f) => (
          <div key={f.title} style={{ border: '1px solid #2a2a2a', borderRadius: 12, background: '#111', padding: '1.25rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{f.icon}</span>
            <h3 style={{ margin: '0.75rem 0 0.5rem', color: '#fff', fontSize: '1rem' }}>{f.title}</h3>
            <p style={{ margin: 0, color: '#a0a0a0', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

// ── Feed page (logged-in) ─────────────────────────────────

function FeedPage({ user }: { user: User }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  async function loadReviews(reset = false) {
    const supabase = createClient();
    const currentOffset = reset ? 0 : offset;
    setLoading(true);
    try {
      const data = await fetchGlobalFeed(supabase, LIMIT);
      if (reset) {
        setReviews(data);
      } else {
        setReviews((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === LIMIT);
      setOffset(currentOffset + data.length);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReviews(true); }, [user.id]);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#fff' }}>Recently reviewed</h1>

      {loading && reviews.length === 0 && (
        <p style={{ color: '#666', textAlign: 'center', padding: '3rem 0' }}>Loading feed…</p>
      )}

      {!loading && reviews.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">No reviews yet</p>
          <p className="empty-state-sub">
            <Link href="/search" style={{ color: '#534AB7' }}>Search for music</Link> to leave the first review.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
      </div>

      {hasMore && reviews.length > 0 && (
        <div style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
          <button
            className="button"
            type="button"
            onClick={() => loadReviews()}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page entry ────────────────────────────────────────────

export default function HomePage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Still loading auth state
  if (user === undefined) return null;

  return user ? <FeedPage user={user} /> : <LandingPage />;
}
