'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Review, ReviewTarget } from '@vinyl/shared/types/review';
import type { Album, Artist, MusicItem, Track } from '@vinyl/shared/types/music';
import { searchSpotify } from '@vinyl/shared/lib/spotify';
import { HalfStarDisplay } from '../../components/HalfStarDisplay';
import { ReviewModal } from '../../components/ReviewModal';
import { createClient } from '../../lib/supabase/client';

type UserRatings = Record<string, number>; // spotifyId -> rating

// ── Helpers ──────────────────────────────────────────────

function itemToTarget(item: MusicItem): ReviewTarget {
  if (item.kind === 'track') {
    return { kind: 'track', spotifyId: item.id, title: item.title, artist: item.artist, artworkUrl: item.artworkUrl ?? null };
  }
  if (item.kind === 'album') {
    return { kind: 'album', spotifyId: item.id, title: item.title, artist: item.artist, artworkUrl: item.artworkUrl ?? null };
  }
  return { kind: 'artist', spotifyId: item.id, title: item.name, artist: item.name, artworkUrl: item.imageUrl ?? null };
}

// ── Result rows ──────────────────────────────────────────

function ResultRow({
  item,
  userRatings,
  onReview,
}: {
  item: MusicItem;
  userRatings: UserRatings;
  onReview: (target: ReviewTarget) => void;
}) {
  const artwork = item.kind === 'track' ? item.artworkUrl : item.kind === 'album' ? item.artworkUrl : item.imageUrl;
  const title = item.kind === 'artist' ? item.name : item.title;
  const subtitle = item.kind === 'track' ? `${item.artist}${item.album ? ' · ' + item.album : ''}` : item.kind === 'album' ? item.artist : (item.genres?.[0] ?? 'Artist');
  const isArtist = item.kind === 'artist';
  const existingRating = userRatings[item.id];

  return (
    <div className="result-row">
      {artwork ? (
        <img src={artwork} alt={title} className={`result-artwork${isArtist ? ' result-artwork-artist' : ''}`} />
      ) : (
        <div className={`result-artwork-placeholder${isArtist ? ' result-artwork-artist' : ''}`} />
      )}
      <div className="result-info">
        <p className="result-title">{title}</p>
        <p className="result-subtitle">{subtitle}</p>
      </div>
      <div className="result-action">
        {existingRating ? (
          <span className="rated-badge">
            <HalfStarDisplay rating={existingRating} size={12} />
            {existingRating}
          </span>
        ) : (
          <button className="review-button" type="button" onClick={() => onReview(itemToTarget(item))}>
            Review
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [modalTarget, setModalTarget] = useState<ReviewTarget | null>(null);
  const [userRatings, setUserRatings] = useState<UserRatings>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setTracks([]);
      setAlbums([]);
      setArtists([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const results = await searchSpotify(supabase, q);
      setTracks(results.tracks);
      setAlbums(results.albums);
      setArtists(results.artists);
      setSearched(true);
    } catch {
      // Show empty results on error
      setTracks([]);
      setAlbums([]);
      setArtists([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  }

  function handleReviewSuccess(review: Review) {
    setUserRatings((prev) => ({ ...prev, [review.spotifyId]: review.rating }));
  }

  const hasResults = tracks.length > 0 || albums.length > 0 || artists.length > 0;

  return (
    <>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#666', pointerEvents: 'none', fontSize: '1.1rem' }}>
            &#x2315;
          </span>
          <input
            className="search-bar"
            style={{ paddingLeft: '2.5rem', paddingRight: query ? '2.5rem' : '0.875rem' }}
            type="search"
            placeholder="Search tracks, albums, artists…"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setTracks([]); setAlbums([]); setArtists([]); setSearched(false); }}
              style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem' }}
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem 0' }}>Searching…</p>
        )}

        {/* Empty / initial state */}
        {!loading && !searched && (
          <div className="empty-state">
            <p className="empty-state-title">What are you listening to?</p>
            <p className="empty-state-sub">Search any track, album, or artist</p>
          </div>
        )}

        {/* No results */}
        {!loading && searched && !hasResults && (
          <div className="empty-state">
            <p className="empty-state-title">No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {/* Results */}
        {!loading && hasResults && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {tracks.length > 0 && (
              <section className="result-section">
                <p className="result-section-title">Tracks</p>
                {tracks.map((t) => (
                  <ResultRow key={t.id} item={t} userRatings={userRatings} onReview={setModalTarget} />
                ))}
              </section>
            )}
            {albums.length > 0 && (
              <>
                {tracks.length > 0 && <hr className="divider" />}
                <section className="result-section">
                  <p className="result-section-title">Albums</p>
                  {albums.map((a) => (
                    <ResultRow key={a.id} item={a} userRatings={userRatings} onReview={setModalTarget} />
                  ))}
                </section>
              </>
            )}
            {artists.length > 0 && (
              <>
                {(tracks.length > 0 || albums.length > 0) && <hr className="divider" />}
                <section className="result-section">
                  <p className="result-section-title">Artists</p>
                  {artists.map((a) => (
                    <ResultRow key={a.id} item={a} userRatings={userRatings} onReview={setModalTarget} />
                  ))}
                </section>
              </>
            )}
          </div>
        )}
      </div>

      <ReviewModal
        target={modalTarget}
        onClose={() => setModalTarget(null)}
        onSuccess={handleReviewSuccess}
      />
    </>
  );
}
