'use client';

import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { DiaryEntry } from '@vinyl/shared/lib/diary';
import { createDiaryEntry } from '@vinyl/shared/lib/diary';
import { searchSpotify } from '@vinyl/shared/lib/spotify';
import type { ReviewKind } from '@vinyl/shared/types/review';

import { createClient } from '../lib/supabase/client';

type SearchResult = {
  spotifyId: string;
  kind: ReviewKind;
  title: string;
  artist: string;
  artworkUrl: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (entry: DiaryEntry) => void;
};

const KIND_COLORS: Record<ReviewKind, { bg: string; text: string }> = {
  track: { bg: '#1a1a1a', text: '#a0a0a0' },
  album: { bg: '#1E1A3A', text: '#7F77DD' },
  artist: { bg: '#0a1f1a', text: '#1D9E75' },
};

export function LogEntryModal({ isOpen, onClose, onSuccess }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [note, setNote] = useState('');
  const [listenedAt, setListenedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setNote('');
      setLoading(false);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const supabase = createClient();
        const data = await searchSpotify(supabase, query);
        const combined: SearchResult[] = [
          ...data.tracks.slice(0, 5).map(t => ({ spotifyId: t.id, kind: 'track' as ReviewKind, title: t.title, artist: t.artist, artworkUrl: t.artworkUrl ?? null })),
          ...data.albums.slice(0, 3).map(a => ({ spotifyId: a.id, kind: 'album' as ReviewKind, title: a.title, artist: a.artist, artworkUrl: a.artworkUrl ?? null })),
          ...data.artists.slice(0, 2).map(a => ({ spotifyId: a.id, kind: 'artist' as ReviewKind, title: a.name, artist: '', artworkUrl: a.imageUrl ?? null })),
        ];
        setResults(combined);
      } catch {
        // ignore search errors
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, selected]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const entry = await createDiaryEntry(supabase, {
        spotifyId: selected.spotifyId,
        entityType: selected.kind,
        title: selected.title,
        artist: selected.artist,
        artworkUrl: selected.artworkUrl,
        listenedAt: new Date(listenedAt).toISOString(),
        note: note.trim() || null,
      });
      onSuccess(entry);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log entry. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Log a listening entry</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Search or selected item */}
          {selected ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              {selected.artworkUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={selected.artworkUrl} alt={selected.title} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: 6, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', flexShrink: 0 }}>♪</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</p>
                {selected.artist && <p style={{ color: '#a0a0a0', fontSize: '0.75rem', margin: '2px 0 0' }}>{selected.artist}</p>}
                <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: 20, background: KIND_COLORS[selected.kind].bg, color: KIND_COLORS[selected.kind].text, display: 'inline-block', marginTop: 4, textTransform: 'capitalize' }}>{selected.kind}</span>
              </div>
              <button type="button" onClick={() => { setSelected(null); setQuery(''); }} style={{ background: 'none', border: 'none', color: '#534AB7', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}>Change</button>
            </div>
          ) : (
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <input
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
                type="text"
                placeholder="Search for a track, album, or artist…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {(searching || results.length > 0) && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                  {searching && <p style={{ color: '#666', fontSize: '0.75rem', padding: '8px 12px', margin: 0 }}>Searching…</p>}
                  {results.map(r => (
                    <button
                      key={`${r.kind}-${r.spotifyId}`}
                      type="button"
                      onClick={() => { setSelected(r); setResults([]); }}
                      style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      {r.artworkUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={r.artworkUrl} alt={r.title} style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 4, background: '#333', flexShrink: 0 }} />
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: '0.8125rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                        {r.artist && <p style={{ color: '#666', fontSize: '0.75rem', margin: 0 }}>{r.artist}</p>}
                      </div>
                      <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: 20, background: KIND_COLORS[r.kind].bg, color: KIND_COLORS[r.kind].text, textTransform: 'capitalize', flexShrink: 0 }}>{r.kind}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.8125rem', marginBottom: 6 }}>Note (optional)</label>
            <textarea
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
              placeholder="Add a note…"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              style={{ resize: 'none' }}
            />
            <p style={{ color: '#666', fontSize: '0.7rem', textAlign: 'right', margin: '2px 0 0' }}>{note.length}/200</p>
          </div>

          {/* Date/time */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.8125rem', marginBottom: 6 }}>Date & time</label>
            <input
              type="datetime-local"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none"
              value={listenedAt}
              onChange={(e) => setListenedAt(e.target.value)}
            />
          </div>

          {error && <p style={{ color: '#E24B4A', fontSize: '0.875rem', marginBottom: 12 }}>{error}</p>}

          <button
            type="submit"
            disabled={!selected || loading}
            className="bg-[#534AB7] text-white rounded-lg px-4 py-2 hover:bg-[#4a42a3] transition-colors font-medium"
            style={{ width: '100%', opacity: !selected ? 0.5 : 1, cursor: !selected ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="animate-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                Logging…
              </span>
            ) : 'Log entry'}
          </button>
        </form>
      </div>
    </div>
  );
}
