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
    <div className="max-w-3xl mx-auto px-6">
      {/* Hero */}
      <section className="py-24 md:py-32 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-playfair font-bold text-white leading-none tracking-tight mb-6">
          Review every song<br /><span className="text-[#E53935] italic">you've ever heard.</span>
        </h1>
        <p className="text-lg md:text-xl font-outfit text-[#c0c0c0] leading-relaxed max-w-lg mb-12">
          The social music review platform. Rate, review, and discover music together.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#E53935] text-white font-outfit font-bold tracking-wide hover:bg-[#c43f3e] hover:shadow-[0_0_20px_rgba(229,57,53,0.4)] transition-all transform hover:-translate-y-0.5 text-center"
          >
            Get Started
          </Link>
          <Link
            href="/explore"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-white/10 text-[#a0a0a0] font-outfit font-medium hover:text-white hover:border-white/30 hover:bg-white/5 transition-all text-center"
          >
            Browse Reviews
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-24">
        {[
          { icon: '★', title: 'Cinematic Ratings', body: 'Precise ratings from 0.5 to 5.0 — because music deserves nuance.' },
          { icon: '♬', title: 'Curated Voices', body: 'Follow friends and read editorial-quality reviews from the community.' },
          { icon: '✦', title: 'Deep Discovery', body: 'Find hidden gems and trending music reviewed by passionate listeners.' },
        ].map((f) => (
          <div key={f.title} className="group p-8 rounded-2xl bg-[#0a0a0a] border border-white/5 hover:border-[#E53935]/30 hover:bg-[#111] transition-all hover:-translate-y-1">
            <span className="text-3xl text-[#E53935] mb-4 block opacity-80 group-hover:opacity-100 transition-opacity font-playfair">{f.icon}</span>
            <h3 className="text-lg font-outfit font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-[#888] font-outfit text-sm leading-relaxed">{f.body}</p>
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
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-playfair font-bold text-white mb-8 border-b border-white/5 pb-4">
        Recently Reviewed
      </h1>

      {loading && reviews.length === 0 && (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-[#E53935] border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="py-20 text-center bg-[#0a0a0a] border border-white/5 rounded-2xl">
          <p className="font-playfair text-2xl text-white mb-2">No reviews yet</p>
          <p className="font-outfit text-[#888]">
            <Link href="/search" className="text-[#E53935] hover:underline">Find an album</Link> to leave the first review.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
      </div>

      {hasMore && reviews.length > 0 && (
        <div className="text-center pt-10 pb-4">
          <button
            className="button px-6 py-2"
            type="button"
            onClick={() => loadReviews()}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load More'}
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
