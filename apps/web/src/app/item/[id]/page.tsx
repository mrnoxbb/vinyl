import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { ReviewKind, ReviewTarget } from '@vinyl/shared/types/review';
import { fetchItemReviews, fetchItemStats } from '@vinyl/shared/lib/reviews';
import { getAlbum, getArtist, getTrack } from '@vinyl/shared/lib/spotify';

import { createClient } from '../../../lib/supabase/server';
import { HalfStarDisplay } from '../../../components/HalfStarDisplay';
import { ItemReviewSection } from '../../../components/ItemReviewSection';

type Props = {
  params: { id: string };
  searchParams: { type?: string };
};

function resolveKind(raw: string | undefined): ReviewKind {
  if (raw === 'album' || raw === 'artist') return raw;
  return 'track';
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  try {
    const supabase = await createClient();
    const kind = resolveKind(searchParams.type);
    let title = params.id;
    let artist = '';
    let imageUrl: string | null = null;

    if (kind === 'track') {
      const t = await getTrack(supabase, params.id);
      title = t.title; artist = t.artist; imageUrl = t.artworkUrl ?? null;
    } else if (kind === 'album') {
      const a = await getAlbum(supabase, params.id);
      title = a.title; artist = a.artist; imageUrl = a.artworkUrl ?? null;
    } else {
      const a = await getArtist(supabase, params.id);
      title = a.name; artist = a.name; imageUrl = a.imageUrl ?? null;
    }

    const stats = await fetchItemStats(supabase, params.id, kind).catch(() => null);
    const desc = stats && stats.reviewCount > 0
      ? `Community rating: ${stats.avgRating}/5 from ${stats.reviewCount} reviews on VINYL`
      : `${title}${artist ? ' by ' + artist : ''} — reviews on VINYL`;

    return {
      title: `${title}${artist && kind !== 'artist' ? ' by ' + artist : ''} — VINYL`,
      description: desc,
      openGraph: {
        title: `${title}${artist && kind !== 'artist' ? ' by ' + artist : ''} — VINYL`,
        description: desc,
        images: imageUrl ? [{ url: imageUrl }] : [],
      },
      twitter: { card: 'summary_large_image' },
    };
  } catch {
    return { title: 'VINYL' };
  }
}

export default async function ItemPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const kind = resolveKind(searchParams.type);

  let itemTitle = '';
  let itemArtist = '';
  let itemArtwork: string | null = null;
  let itemAlbum: string | null = null;
  let itemRelease: string | null = null;

  try {
    if (kind === 'track') {
      const t = await getTrack(supabase, params.id);
      itemTitle = t.title; itemArtist = t.artist;
      itemArtwork = t.artworkUrl ?? null; itemAlbum = t.album ?? null;
    } else if (kind === 'album') {
      const a = await getAlbum(supabase, params.id);
      itemTitle = a.title; itemArtist = a.artist;
      itemArtwork = a.artworkUrl ?? null; itemRelease = a.releaseDate ?? null;
    } else {
      const a = await getArtist(supabase, params.id);
      itemTitle = a.name; itemArtist = a.name; itemArtwork = a.imageUrl ?? null;
    }
  } catch {
    notFound();
  }

  const [stats, reviews] = await Promise.all([
    fetchItemStats(supabase, params.id, kind).catch(() => ({
      avgRating: 0,
      reviewCount: 0,
      distribution: {} as Record<string, number>,
    })),
    fetchItemReviews(supabase, params.id, kind).catch(() => []),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  const target: ReviewTarget = {
    kind,
    spotifyId: params.id,
    title: itemTitle,
    artist: itemArtist,
    artworkUrl: itemArtwork,
    album: itemAlbum,
  };

  const distEntries = Object.entries(stats.distribution)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => parseFloat(b) - parseFloat(a));
  const maxCount = Math.max(...distEntries.map(([, c]) => c), 1);

  return (
    <main className="min-h-screen bg-transparent relative">
      {/* Editorial Bleeding Hero Background */}
      {itemArtwork && (
        <div className="absolute top-0 left-0 right-0 h-[75vh] z-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 blur-[80px] transform scale-110 saturate-150" 
            style={{ backgroundImage: `url(${itemArtwork})` }} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030303]/90 to-[#030303]" />
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-16">
        
        <div className="flex flex-col md:flex-row gap-10 lg:gap-16 mb-16 items-start">
          {/* Main Hero Artwork - Dominant */}
          {itemArtwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={itemArtwork}
              alt={itemTitle}
              className="w-full max-w-[320px] aspect-square rounded-xl object-cover shadow-cinematic flex-shrink-0"
            />
          ) : (
            <div className="w-full max-w-[320px] aspect-square rounded-xl bg-[#0a0a0a] shadow-cinematic flex items-center justify-center text-6xl text-[#E53935]/20 flex-shrink-0 border border-white/5">
              ♪
            </div>
          )}

          {/* Typography-led info */}
          <div className="flex flex-col w-full">
            <span className="inline-block text-xs font-mono font-bold tracking-[0.2em] uppercase text-[#E53935] mb-4 w-fit">
              {kind}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight font-playfair mb-3" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
              {itemTitle}
            </h1>
            
            {kind !== 'artist' && (
              <p className="text-xl md:text-2xl text-[#c0c0c0] font-outfit mb-4">{itemArtist}</p>
            )}

            <div className="flex gap-4 mb-8 font-mono text-sm text-[#888]">
              {itemAlbum && <span>{itemAlbum}</span>}
              {itemAlbum && itemRelease && <span>•</span>}
              {itemRelease && <span>{itemRelease}</span>}
            </div>

            {/* Headline Rating */}
            {stats.reviewCount > 0 ? (
              <div className="mt-auto flex items-end gap-5">
                <span className="text-7xl lg:text-8xl font-playfair font-bold text-white leading-none tracking-tighter" style={{ textShadow: '0 8px 32px rgba(229,57,53,0.3)' }}>
                  {stats.avgRating.toFixed(1)}
                </span>
                <div className="pb-3 flex flex-col gap-1">
                  <HalfStarDisplay rating={stats.avgRating} size={28} />
                  <p className="text-[#a0a0a0] font-mono text-sm tracking-wide">{stats.reviewCount} REVIEWS</p>
                </div>
              </div>
            ) : (
              <p className="mt-auto font-outfit text-[#888] text-lg italic">No community verdict yet.</p>
            )}
          </div>
        </div>

        {/* Rating distribution - Editorial layout */}
        {distEntries.length > 0 && (
          <section className="mb-16">
            <h2 className="text-sm font-mono tracking-widest uppercase text-[#666] mb-6 border-b border-white/5 pb-2">Community Verdict</h2>
            <div className="flex items-end gap-2 h-32 w-full max-w-sm">
              {[5, 4, 3, 2, 1].map((ratingNum) => {
                const count = stats.distribution[ratingNum.toString()] || 0;
                const heightPct = count > 0 ? Math.max((count / maxCount) * 100, 4) : 0;
                return (
                  <div key={ratingNum} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-xs font-mono text-[#444] group-hover:text-[#888] transition-colors opacity-0 group-hover:opacity-100">{count > 0 ? count : ''}</span>
                    <div className="w-full bg-[#111] rounded-t-sm relative overflow-hidden flex-1 flex items-end border-b-2 border-transparent">
                      <div 
                        className="w-full bg-[#E53935] rounded-t-sm transition-all duration-1000 ease-out"
                        style={{ height: `${heightPct}%`, opacity: count === maxCount ? 1 : 0.4 }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[#888]">{ratingNum}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Reviews section */}
        <ItemReviewSection
          target={target}
          initialReviews={reviews}
          initialStats={stats}
          currentUserId={user?.id ?? null}
        />
      </div>
    </main>
  );
}
