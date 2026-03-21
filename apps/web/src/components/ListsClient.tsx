'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { UserList } from '@vinyl/shared/lib/lists';
import { createList, deleteList, updateList } from '@vinyl/shared/lib/lists';

import { createClient } from '../lib/supabase/client';

type Props = {
  initialLists: UserList[];
};

function ArtworkCollage({ artworks }: { artworks: (string | null)[] }) {
  const slots = [0, 1, 2, 3];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', aspectRatio: '1', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
      {slots.map(i => (
        artworks[i]
          // eslint-disable-next-line @next/next/no-img-element
          ? <img key={i} src={artworks[i]!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div key={i} style={{ background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 16 }}>♪</div>
      ))}
    </div>
  );
}

export function ListsClient({ initialLists }: Props) {
  const router = useRouter();
  const [lists, setLists] = useState(initialLists);
  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPublic, setCreatePublic] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setCreateError('');
    setCreateLoading(true);
    try {
      const supabase = createClient();
      const list = await createList(supabase, {
        title: createTitle.trim(),
        description: createDesc.trim() || null,
        isPublic: createPublic,
      });
      router.push(`/lists/${list.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create list.');
      setCreateLoading(false);
    }
  }

  async function handleTogglePublic(list: UserList) {
    setMenuOpenId(null);
    const supabase = createClient();
    try {
      await updateList(supabase, list.id, { isPublic: !list.isPublic });
      setLists(prev => prev.map(l => l.id === list.id ? { ...l, isPublic: !l.isPublic } : l));
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    setDeletingId(null);
    const supabase = createClient();
    try {
      await deleteList(supabase, id);
      setLists(prev => prev.filter(l => l.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Create modal */}
      {creating && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setCreating(false); }}
        >
          <div style={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Create a new list</h2>
              <button onClick={() => setCreating(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.8125rem', marginBottom: 6 }}>Title <span style={{ color: '#E24B4A' }}>*</span></label>
                <input
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
                  placeholder="My list title"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value.slice(0, 100))}
                  autoFocus
                />
                <p style={{ color: '#666', fontSize: '0.7rem', textAlign: 'right', margin: '2px 0 0' }}>{createTitle.length}/100</p>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.8125rem', marginBottom: 6 }}>Description</label>
                <textarea
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:border-[#534AB7] focus:outline-none placeholder:text-[#666666]"
                  placeholder="What's this list about?"
                  rows={2}
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value.slice(0, 300))}
                  style={{ resize: 'none' }}
                />
                <p style={{ color: '#666', fontSize: '0.7rem', textAlign: 'right', margin: '2px 0 0' }}>{createDesc.length}/300</p>
              </div>
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#a0a0a0', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={createPublic} onChange={(e) => setCreatePublic(e.target.checked)} />
                  Public list
                </label>
              </div>
              {createError && <p style={{ color: '#E24B4A', fontSize: '0.875rem', marginBottom: 12 }}>{createError}</p>}
              <button
                type="submit"
                disabled={!createTitle.trim() || createLoading}
                className="bg-[#534AB7] text-white rounded-lg px-4 py-2 hover:bg-[#4a42a3] transition-colors font-medium"
                style={{ width: '100%', opacity: !createTitle.trim() ? 0.5 : 1 }}
              >
                {createLoading ? 'Creating…' : 'Create list'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deletingId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380 }}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Delete this list?</h3>
            <p style={{ color: '#a0a0a0', fontSize: '0.875rem', marginBottom: 20 }}>This will permanently delete the list and all its items. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeletingId(null)} className="border border-[#2a2a2a] text-[#a0a0a0] rounded-lg px-4 py-2 text-sm hover:text-white transition-colors flex-1">Cancel</button>
              <button onClick={() => handleDelete(deletingId)} className="border border-[#E24B4A] text-[#E24B4A] rounded-lg px-4 py-2 text-sm hover:bg-[#E24B4A] hover:text-white transition-colors flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <h1 className="text-3xl font-playfair font-bold text-white tracking-tight">My Lists</h1>
        <button
          onClick={() => setCreating(true)}
          className="button button-primary py-1.5 px-4 text-sm font-outfit"
        >
          Create List
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white font-semibold mb-1">No lists yet</p>
          <p className="text-[#a0a0a0] text-sm mb-4">Create a ranked collection of your favorite music</p>
          <button
            onClick={() => setCreating(true)}
            className="bg-[#534AB7] text-white rounded-lg px-4 py-2 hover:bg-[#4a42a3] transition-colors font-medium text-sm"
          >
            Create your first list
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lists.map(list => (
            <div
              key={list.id}
              className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-[#E53935]/30 transition-all hover:shadow-glow hover:-translate-y-1 group"
              style={{ position: 'relative' }}
            >
              <a href={`/lists/${list.id}`} className="block">
                <ArtworkCollage artworks={[]} />
                <div className="p-4 bg-gradient-to-t from-[#050505] to-[#0a0a0a]">
                  <p className="text-white text-base font-playfair font-semibold truncate tracking-wide">{list.title}</p>
                  <p className="text-[#666] font-mono text-[0.65rem] uppercase tracking-widest mt-1">0 items</p>
                </div>
              </a>
              <div className="px-4 pb-4 pt-2 border-t border-white/5 mt-2 flex justify-between items-center group-hover:border-white/10 transition-colors">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest" style={{ color: list.isPublic ? '#1D9E75' : '#666' }}>
                  {list.isPublic ? 'Public' : 'Private'}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === list.id ? null : list.id)}
                    className="text-[#666] hover:text-white transition-colors"
                  >
                    ⋯
                  </button>
                  {menuOpenId === list.id && (
                    <div className="absolute right-0 bottom-full mb-1 z-20 bg-[#111] border border-white/10 rounded-lg overflow-hidden min-w-[140px] shadow-2xl animate-fade-in">
                      <a
                        href={`/lists/${list.id}`}
                        className="block w-full text-left px-4 py-2.5 font-outfit text-sm text-[#e0e0e0] hover:bg-white/5 transition-colors"
                        onClick={() => setMenuOpenId(null)}
                      >Edit List</a>
                      <button
                        onClick={() => handleTogglePublic(list)}
                        className="block w-full text-left px-4 py-2.5 font-outfit text-sm text-[#e0e0e0] hover:bg-white/5 transition-colors"
                      >Make {list.isPublic ? 'Private' : 'Public'}</button>
                      <button
                        onClick={() => { setMenuOpenId(null); setDeletingId(list.id); }}
                        className="block w-full text-left px-4 py-2.5 font-outfit text-sm text-[#E53935] hover:bg-[#E53935]/10 transition-colors border-t border-white/5"
                      >Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
