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
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Hero */}
        <div className="flex gap-6 mb-8 flex-col sm:flex-row">
          {itemArtwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={itemArtwork}
              alt={itemTitle}
              className="rounded-xl object-cover flex-shrink-0"
              style={{ width: 200, height: 200 }}
            />
          ) : (
            <div
              className="flex-shrink-0 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-4xl text-[#666]"
              style={{ width: 200, height: 200 }}
            >
              ♪
            </div>
          )}

          <div className="flex flex-col gap-2 min-w-0">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#534AB7] bg-[#534AB7]/10 px-2 py-0.5 rounded-full w-fit">
              {kind}
            </span>
            <h1 className="text-2xl font-bold text-white leading-tight">{itemTitle}</h1>
            {kind !== 'artist' && (
              <p className="text-[#a0a0a0] text-base">{itemArtist}</p>
            )}
            {itemAlbum && <p className="text-[#666] text-sm">{itemAlbum}</p>}
            {itemRelease && <p className="text-[#666] text-sm">{itemRelease}</p>}

            {stats.reviewCount > 0 ? (
              <div className="mt-2 flex items-end gap-3">
                <span className="text-5xl font-bold text-white leading-none">
                  {stats.avgRating.toFixed(1)}
                </span>
                <div className="pb-1">
                  <HalfStarDisplay rating={stats.avgRating} size={24} />
                  <p className="text-[#a0a0a0] text-sm mt-1">{stats.reviewCount} reviews</p>
                </div>
              </div>
            ) : (
              <p className="text-[#666] text-sm mt-2">No reviews yet — be the first!</p>
            )}
          </div>
        </div>

        {/* Rating distribution */}
        {distEntries.length > 0 && (
          <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Rating breakdown</h2>
            <div className="flex flex-col gap-2">
              {distEntries.map(([label, count]) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="text-[#a0a0a0] w-8 text-right flex-shrink-0">{label}</span>
                  <div className="flex-1 bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        background: count === maxCount ? '#7F77DD' : '#534AB7',
                      }}
                    />
                  </div>
                  <span className="text-[#666] w-6 flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews section — client component for interactivity */}
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
