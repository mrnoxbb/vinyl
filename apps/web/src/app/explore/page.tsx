import type { Metadata } from 'next';
import Link from 'next/link';

import type { DiscoveryItem } from '@vinyl/shared/lib/discovery';
import {
  fetchHiddenGems,
  fetchHotRightNow,
  fetchMostReviewedWeek,
  fetchNewReleasesReviewed,
} from '@vinyl/shared/lib/discovery';
import { fetchGlobalFeed } from '@vinyl/shared/lib/reviews';

import { createClient } from '../../lib/supabase/server';
import { HalfStarDisplay } from '../../components/HalfStarDisplay';
import { GlobalFeed } from '../../components/GlobalFeed';

export const metadata: Metadata = { title: 'Explore | VINYL' };

function ItemCard({ item }: { item: DiscoveryItem }) {
  return (
    <Link
      href={`/item/${item.spotifyId}?type=${item.kind}`}
      className="block bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden hover:border-[#E53935]/50 transition-all hover:shadow-glow hover:-translate-y-1 group group-card"
    >
      {item.artworkUrl ? (
        <div className="w-full aspect-square overflow-hidden relative">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.artworkUrl}
            alt={item.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        </div>
      ) : (
        <div className="w-full aspect-square bg-[#111] flex items-center justify-center text-4xl text-[#333] font-playfair italic">♪</div>
      )}
      <div className="p-4 bg-gradient-to-t from-[#050505] to-[#0a0a0a]">
        <p className="text-white text-sm font-playfair font-semibold truncate tracking-wide">{item.title}</p>
        <p className="text-[#888] font-outfit text-xs truncate mt-0.5">{item.artist}</p>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          {item.averageRating !== null && item.averageRating > 0 && (
            <div className="flex items-center gap-1.5 bg-[#E53935]/10 px-2 py-0.5 rounded text-[#E53935]">
              <HalfStarDisplay rating={item.averageRating} size={10} />
              <span className="font-mono text-[0.7rem] font-bold tracking-widest leading-none mt-px">{item.averageRating.toFixed(1)}</span>
            </div>
          )}
          {item.reviewCount > 0 && (
            <span className="text-[#555] font-mono text-[0.65rem] uppercase tracking-widest ml-auto">{item.reviewCount} reviews</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function DiscoverySection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: DiscoveryItem[];
}) {
  return (
    <section className="mb-16">
      <div className="mb-6 flex flex-col gap-1 border-b border-white/5 pb-4">
        <h2 className="text-2xl font-playfair font-bold text-white tracking-tight">{title}</h2>
        <p className="text-[#a0a0a0] font-outfit text-sm">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-10 text-center">
          <p className="font-outfit text-[#666]">Reviews will appear here once the community sparks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {items.slice(0, 8).map(item => (
            <ItemCard key={`${item.spotifyId}-${item.kind}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function ExplorePage() {
  const supabase = await createClient();

  const [hot, week, gems, newReleases, feed] = await Promise.all([
    fetchHotRightNow(supabase, 8).catch(() => []),
    fetchMostReviewedWeek(supabase, 8).catch(() => []),
    fetchHiddenGems(supabase, 8).catch(() => []),
    fetchNewReleasesReviewed(supabase, 8).catch(() => []),
    fetchGlobalFeed(supabase, 20).catch(() => []),
  ]);

  return (
    <main className="min-h-screen bg-transparent pt-12">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-4xl md:text-5xl font-playfair font-bold text-white mb-12 tracking-tight">Explore</h1>

        <DiscoverySection
          title="Hot right now"
          subtitle="Most reviewed in the last 24 hours"
          items={hot}
        />

        <DiscoverySection
          title="Most reviewed this week"
          subtitle="What everyone's been reviewing"
          items={week}
        />

        <DiscoverySection
          title="Hidden gems"
          subtitle="High ratings, under the radar"
          items={gems}
        />

        <DiscoverySection
          title="New arrivals"
          subtitle="Recent releases with community coverage"
          items={newReleases}
        />

        {/* Global feed */}
        <section className="mt-20">
          <div className="mb-8 border-b border-white/5 pb-4">
            <h2 className="text-2xl font-playfair font-bold text-white tracking-tight">Latest Reviews</h2>
          </div>
          <GlobalFeed initialReviews={feed} />
        </section>
      </div>
    </main>
  );
}
