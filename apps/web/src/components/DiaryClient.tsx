'use client';

import { useMemo, useState } from 'react';

import type { DiaryEntry } from '@vinyl/shared/lib/diary';
import { deleteDiaryEntry } from '@vinyl/shared/lib/diary';
import type { ReviewKind } from '@vinyl/shared/types/review';

import { createClient } from '../lib/supabase/client';
import { LogEntryModal } from './LogEntryModal';

type Filter = 'all' | 'track' | 'album' | 'artist';
type DateRange = 'all' | 'week' | 'month' | 'year';

type Props = {
  initialEntries: DiaryEntry[];
};

const KIND_COLORS: Record<ReviewKind, { bg: string; text: string }> = {
  track: { bg: '#1a1a1a', text: '#a0a0a0' },
  album: { bg: '#1E1A3A', text: '#7F77DD' },
  artist: { bg: '#0a1f1a', text: '#1D9E75' },
};

const PAGE_SIZE = 30;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function groupByMonth(entries: DiaryEntry[]): [string, DiaryEntry[]][] {
  const groups = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const d = new Date(e.listenedAt);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries());
}

export function DiaryClient({ initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<Filter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffs: Record<DateRange, number> = {
      all: 0,
      week: now - 7 * 24 * 60 * 60 * 1000,
      month: now - 30 * 24 * 60 * 60 * 1000,
      year: now - 365 * 24 * 60 * 60 * 1000,
    };
    const cutoff = cutoffs[dateRange];
    const q = search.toLowerCase();
    return entries.filter(e => {
      if (filter !== 'all' && e.entityType !== filter) return false;
      if (cutoff > 0 && new Date(e.listenedAt).getTime() < cutoff) return false;
      if (q && !e.title.toLowerCase().includes(q) && !e.artist.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, filter, dateRange, search]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > visible.length;
  const grouped = groupByMonth(visible);

  async function handleDelete(id: string) {
    setDeletingId(null);
    const supabase = createClient();
    try {
      await deleteDiaryEntry(supabase, id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch {
      // ignore
    }
  }

  const hasFilters = filter !== 'all' || dateRange !== 'all' || search !== '';

  return (
    <>
      <LogEntryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(entry) => {
          setEntries(prev => [entry, ...prev]);
          setModalOpen(false);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">My Diary</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#534AB7] text-white rounded-lg px-4 py-2 hover:bg-[#4a42a3] transition-colors font-medium text-sm"
        >
          Log entry
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Type filter */}
        <div className="flex gap-1">
          {(['all', 'track', 'album', 'artist'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                filter === f
                  ? 'bg-[#534AB7] text-white'
                  : 'border border-[#2a2a2a] text-[#a0a0a0] hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f + 's'}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <select
          value={dateRange}
          onChange={(e) => { setDateRange(e.target.value as DateRange); setPage(1); }}
          className="bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-1 text-xs focus:border-[#534AB7] focus:outline-none"
        >
          <option value="all">All time</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by artist or title…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[180px] bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-1 text-xs focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
        />
      </div>

      {/* Empty states */}
      {entries.length === 0 ? (
        <div className="text-center py-16">
          <div style={{ fontSize: 24, color: '#2a2a2a', marginBottom: 12 }}>♪</div>
          <p className="text-white font-semibold mb-1">Your diary is empty</p>
          <p className="text-[#a0a0a0] text-sm mb-4">Log what you&apos;re listening to — no rating required</p>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-[#534AB7] text-white rounded-lg px-4 py-2 hover:bg-[#4a42a3] transition-colors font-medium text-sm"
          >
            Log your first entry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#a0a0a0] text-sm mb-2">No entries match your filters</p>
          {hasFilters && (
            <button
              onClick={() => { setFilter('all'); setDateRange('all'); setSearch(''); setPage(1); }}
              className="text-[#534AB7] text-sm hover:text-[#7F77DD] transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {grouped.map(([month, monthEntries]) => (
            <div key={month} className="mb-8">
              <p className="text-xs font-medium text-[#a0a0a0] uppercase tracking-widest mb-3">{month}</p>
              <div className="flex flex-col gap-1">
                {monthEntries.map(entry => (
                  <div key={entry.id}>
                    {deletingId === entry.id ? (
                      <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1a1a1a]">
                        <p className="flex-1 text-sm text-[#a0a0a0]">Remove this entry?</p>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs text-[#a0a0a0] hover:text-white transition-colors px-2"
                        >Cancel</button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-xs text-[#E24B4A] hover:text-white transition-colors px-2"
                        >Remove</button>
                      </div>
                    ) : (
                      <a
                        href={`/item/${entry.spotifyId}?type=${entry.entityType}`}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#111] transition-colors group"
                      >
                        {/* Artwork */}
                        {entry.artworkUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={entry.artworkUrl} alt={entry.title} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', flexShrink: 0, fontSize: 18 }}>♪</div>
                        }

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{entry.title}</p>
                          {entry.artist && <p className="text-[#a0a0a0] text-xs truncate">{entry.artist}</p>}
                          {entry.note && <p className="text-[#666666] text-xs italic truncate">{entry.note}</p>}
                        </div>

                        {/* Meta */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0" onClick={(e) => e.preventDefault()}>
                          <span className="text-[#666666] text-xs">{formatDateTime(entry.listenedAt)}</span>
                          <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: 20, background: KIND_COLORS[entry.entityType].bg, color: KIND_COLORS[entry.entityType].text, textTransform: 'capitalize' }}>
                            {entry.entityType}
                          </span>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(entry.id); }}
                            className="text-[#444] hover:text-[#E24B4A] transition-colors opacity-0 group-hover:opacity-100 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          <div className="text-center pt-4 pb-8">
            <p className="text-[#666] text-xs mb-3">Showing {visible.length} of {filtered.length} entries</p>
            {hasMore && (
              <button
                onClick={() => setPage(p => p + 1)}
                className="border border-[#2a2a2a] text-[#a0a0a0] rounded-lg px-4 py-2 text-sm hover:text-white hover:border-[#444] transition-colors"
              >
                Load more
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
