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
      className="block bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#333] transition-colors group"
    >
      {item.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.artworkUrl}
          alt={item.title}
          className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity"
        />
      ) : (
        <div className="w-full aspect-square bg-[#1a1a1a] flex items-center justify-center text-3xl text-[#444]">♪</div>
      )}
      <div className="p-3">
        <p className="text-white text-xs font-medium truncate">{item.title}</p>
        <p className="text-[#a0a0a0] text-xs truncate">{item.artist}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {item.averageRating !== null && item.averageRating > 0 && (
            <>
              <HalfStarDisplay rating={item.averageRating} size={10} />
              <span className="text-[#a0a0a0] text-xs">{item.averageRating.toFixed(1)}</span>
            </>
          )}
          {item.reviewCount > 0 && (
            <span className="text-[#666] text-xs ml-auto">{item.reviewCount} reviews</span>
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
    <section className="mb-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <p className="text-[#a0a0a0] text-sm mb-4">{subtitle}</p>

      {items.length === 0 ? (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 text-center">
          <p className="text-[#666] text-sm">Reviews will appear here once people start reviewing</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Explore</h1>

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
          title="New releases reviewed"
          subtitle="Recent releases with community reviews"
          items={newReleases}
        />

        {/* Global feed */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Latest reviews</h2>
          <GlobalFeed initialReviews={feed} />
        </section>
      </div>
    </main>
  );
}
