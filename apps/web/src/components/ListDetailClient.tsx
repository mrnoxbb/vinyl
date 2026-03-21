'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import type { ListDetail, ListItem } from '@vinyl/shared/lib/lists';
import { addListItem, removeListItem, reorderListItems, updateList } from '@vinyl/shared/lib/lists';
import { searchSpotify } from '@vinyl/shared/lib/spotify';
import type { ReviewKind } from '@vinyl/shared/types/review';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { createClient } from '../lib/supabase/client';

type SearchResult = {
  spotifyId: string;
  kind: ReviewKind;
  title: string;
  artist: string;
  artworkUrl: string | null;
};

const KIND_COLORS: Record<ReviewKind, { bg: string; text: string }> = {
  track: { bg: '#1a1a1a', text: '#a0a0a0' },
  album: { bg: '#1E1A3A', text: '#7F77DD' },
  artist: { bg: '#0a1f1a', text: '#1D9E75' },
};

function SortableItem({
  item,
  index,
  isOwner,
  onRemove,
}: {
  item: ListItem;
  index: number;
  isOwner: boolean;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 px-4 py-3 bg-[#0a0a0a] border border-white/5 rounded-xl mb-2 hover:border-[#E53935]/30 hover:-translate-x-1 hover:shadow-glow transition-all group group-item"
    >
      {/* Rank */}
      <span className="font-playfair text-2xl font-bold italic text-[#444] min-w-[32px] text-center flex-shrink-0 group-hover:text-[#E53935] transition-colors">
        {index + 1}
      </span>

      {/* Artwork */}
      {item.artworkUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={item.artworkUrl} alt={item.title} className="w-12 h-12 rounded shadow-md object-cover flex-shrink-0 group-hover:scale-105 transition-transform" />
        : <div className="w-12 h-12 rounded bg-[#111] border border-white/5 shadow-md flex items-center justify-center text-[#333] flex-shrink-0 font-playfair italic">♪</div>
      }

      {/* Info */}
      <a href={`/item/${item.spotifyId}?type=${item.entityType}`} className="flex-1 min-w-0" style={{ textDecoration: 'none' }}>
        <p className="text-white text-base font-outfit font-semibold truncate tracking-wider">{item.title}</p>
        {item.artist && <p className="text-[#888] font-outfit text-sm truncate uppercase tracking-widest">{item.artist}</p>}
        {item.note && <p className="text-[#c0c0c0] font-playfair text-[0.9rem] italic mt-1 bg-white/5 px-2 py-1 rounded-md inline-block max-w-full truncate border border-white/5 shadow-sm">{item.note}</p>}
      </a>

      {/* Actions */}
      {isOwner && (
        <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onRemove(item.id)}
            className="text-[#444] hover:text-[#E53935] transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-full hover:bg-[#E53935]/10"
          >✕</button>
          <span
            {...attributes}
            {...listeners}
            className="text-[#444] hover:text-white cursor-grab active:cursor-grabbing text-xl transition-colors select-none"
          >⠿</span>
        </div>
      )}
    </div>
  );
}

type Props = {
  list: ListDetail;
  isOwner: boolean;
};

export function ListDetailClient({ list: initialList, isOwner }: Props) {
  const [items, setItems] = useState(initialList.items);
  const [title, setTitle] = useState(initialList.title);
  const [desc, setDesc] = useState(initialList.description ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Add item modal state
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState<SearchResult[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addSelected, setAddSelected] = useState<SearchResult | null>(null);
  const [addNote, setAddNote] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSearchTimeout, setAddSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = [...items];
    newItems.splice(newIndex, 0, newItems.splice(oldIndex, 1)[0]);
    setItems(newItems);

    const supabase = createClient();
    reorderListItems(supabase, newItems.map(i => i.id)).catch(() => {});
  }

  async function handleSaveEdit() {
    setSaving(true);
    const supabase = createClient();
    try {
      await updateList(supabase, initialList.id, {
        title: title.trim() || initialList.title,
        description: desc.trim() || null,
      });
      setEditing(false);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleRemove(itemId: string) {
    setRemovingId(null);
    const supabase = createClient();
    try {
      await removeListItem(supabase, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch { /* ignore */ }
  }

  function handleAddQueryChange(q: string) {
    setAddQuery(q);
    setAddSelected(null);
    if (addSearchTimeout) clearTimeout(addSearchTimeout);
    if (!q.trim()) { setAddResults([]); return; }
    setAddSearching(true);
    const t = setTimeout(async () => {
      try {
        const supabase = createClient();
        const data = await searchSpotify(supabase, q);
        setAddResults([
          ...data.tracks.slice(0, 5).map(t => ({ spotifyId: t.id, kind: 'track' as ReviewKind, title: t.title, artist: t.artist, artworkUrl: t.artworkUrl ?? null })),
          ...data.albums.slice(0, 3).map(a => ({ spotifyId: a.id, kind: 'album' as ReviewKind, title: a.title, artist: a.artist, artworkUrl: a.artworkUrl ?? null })),
          ...data.artists.slice(0, 2).map(a => ({ spotifyId: a.id, kind: 'artist' as ReviewKind, title: a.name, artist: '', artworkUrl: a.imageUrl ?? null })),
        ]);
      } catch { /* ignore */ } finally { setAddSearching(false); }
    }, 300);
    setAddSearchTimeout(t);
  }

  async function handleAddSubmit(e: FormEvent) {
    e.preventDefault();
    if (!addSelected) return;
    setAddError('');
    setAddLoading(true);
    try {
      const supabase = createClient();
      const newItem = await addListItem(supabase, initialList.id, {
        spotifyId: addSelected.spotifyId,
        entityType: addSelected.kind,
        title: addSelected.title,
        artist: addSelected.artist,
        artworkUrl: addSelected.artworkUrl,
        position: items.length + 1,
        note: addNote.trim() || null,
      });
      setItems(prev => [...prev, newItem]);
      setAddingItem(false);
      setAddQuery('');
      setAddSelected(null);
      setAddNote('');
      setAddResults([]);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add item.');
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <>
      {/* Add item modal */}
      {addingItem && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setAddingItem(false); }}
        >
          <div style={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Add to list</h2>
              <button onClick={() => setAddingItem(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              {addSelected ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  {addSelected.artworkUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={addSelected.artworkUrl} alt={addSelected.title} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: 6, background: '#2a2a2a', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addSelected.title}</p>
                    {addSelected.artist && <p style={{ color: '#a0a0a0', fontSize: '0.75rem', margin: '2px 0 0' }}>{addSelected.artist}</p>}
                    <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: 20, background: KIND_COLORS[addSelected.kind].bg, color: KIND_COLORS[addSelected.kind].text, display: 'inline-block', marginTop: 4, textTransform: 'capitalize' }}>{addSelected.kind}</span>
                  </div>
                  <button type="button" onClick={() => { setAddSelected(null); setAddQuery(''); }} style={{ background: 'none', border: 'none', color: '#534AB7', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}>Change</button>
                </div>
              ) : (
                <div style={{ marginBottom: 16, position: 'relative' }}>
                  <input
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
                    placeholder="Search for a track, album, or artist…"
                    value={addQuery}
                    onChange={(e) => handleAddQueryChange(e.target.value)}
                    autoFocus
                  />
                  {(addSearching || addResults.length > 0) && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                      {addSearching && <p style={{ color: '#666', fontSize: '0.75rem', padding: '8px 12px', margin: 0 }}>Searching…</p>}
                      {addResults.map(r => (
                        <button
                          key={`${r.kind}-${r.spotifyId}`}
                          type="button"
                          onClick={() => { setAddSelected(r); setAddResults([]); }}
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
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.8125rem', marginBottom: 6 }}>Note (optional)</label>
                <textarea
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
                  placeholder="Why is this on the list?"
                  rows={2}
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value.slice(0, 200))}
                  style={{ resize: 'none' }}
                />
                <p style={{ color: '#666', fontSize: '0.7rem', textAlign: 'right', margin: '2px 0 0' }}>{addNote.length}/200</p>
              </div>
              {addError && <p style={{ color: '#E24B4A', fontSize: '0.875rem', marginBottom: 12 }}>{addError}</p>}
              <button
                type="submit"
                disabled={!addSelected || addLoading}
                className="bg-[#534AB7] text-white rounded-lg px-4 py-2 hover:bg-[#4a42a3] transition-colors font-medium"
                style={{ width: '100%', opacity: !addSelected ? 0.5 : 1 }}
              >
                {addLoading ? 'Adding…' : 'Add to list'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm remove modal */}
      {removingId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 }}>
            <p style={{ color: '#fff', fontWeight: 600, marginBottom: 16 }}>Remove this item from the list?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setRemovingId(null)} className="border border-[#2a2a2a] text-[#a0a0a0] rounded-lg px-4 py-2 text-sm hover:text-white transition-colors flex-1">Cancel</button>
              <button onClick={() => handleRemove(removingId)} className="border border-[#E24B4A] text-[#E24B4A] rounded-lg px-4 py-2 text-sm hover:bg-[#E24B4A] hover:text-white transition-colors flex-1">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <a href="/lists" className="text-[#a0a0a0] text-sm hover:text-white transition-colors mb-4 inline-flex items-center gap-1">
          ← Lists
        </a>
        {editing ? (
          <div className="mt-2">
            <input
              className="w-full bg-[#1a1a1a] border border-[#534AB7] text-white rounded-lg px-3 py-2 text-xl font-bold focus:outline-none mb-2"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
            />
            <textarea
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
              placeholder="Description (optional)"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, 300))}
              style={{ resize: 'none' }}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditing(false)} className="border border-[#2a2a2a] text-[#a0a0a0] rounded-lg px-3 py-1 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="bg-[#534AB7] text-white rounded-lg px-3 py-1 text-sm hover:bg-[#4a42a3] transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              {desc && <p className="text-[#a0a0a0] text-sm mt-1">{desc}</p>}
              <div className="flex items-center gap-3 mt-2">
                <a href={`/user/${initialList.ownerUsername}`} className="text-[#534AB7] text-sm hover:text-[#7F77DD] transition-colors">
                  @{initialList.ownerUsername}
                </a>
                <span className="text-[#666] text-sm">{items.length} items</span>
                {!initialList.isPublic && <span className="text-[#666] text-xs bg-[#1a1a1a] px-2 py-0.5 rounded-full">Private</span>}
              </div>
            </div>
            {isOwner && (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setEditing(true)} className="border border-[#2a2a2a] text-[#a0a0a0] rounded-lg px-3 py-1 text-sm hover:text-white transition-colors">Edit</button>
                <button onClick={() => setAddingItem(true)} className="bg-[#534AB7] text-white rounded-lg px-3 py-1 text-sm hover:bg-[#4a42a3] transition-colors">Add items</button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-[#E24B4A] text-sm mb-4">{error}</p>}

      {/* Item list */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#a0a0a0] text-sm mb-3">{isOwner ? 'This list is empty' : 'This list has no items yet'}</p>
          {isOwner && (
            <button onClick={() => setAddingItem(true)} className="bg-[#534AB7] text-white rounded-lg px-4 py-2 hover:bg-[#4a42a3] transition-colors font-medium text-sm">
              Add your first item
            </button>
          )}
        </div>
      ) : isOwner ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col">
              {items.map((item, index) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={index}
                  isOwner={true}
                  onRemove={(id) => setRemovingId(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              isOwner={false}
              onRemove={() => {}}
            />
          ))}
        </div>
      )}
    </>
  );
}
