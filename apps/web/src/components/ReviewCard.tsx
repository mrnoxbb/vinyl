'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { getInitials, timeAgo } from '@vinyl/shared/lib/utils';
import type { Review } from '@vinyl/shared/types/review';
import { deleteReview, likeReview, unlikeReview } from '@vinyl/shared/lib/reviews';

import { createClient } from '../lib/supabase/client';
import { HalfStarDisplay } from './HalfStarDisplay';
import { ReviewModal } from './ReviewModal';

type ReviewCardProps = {
  review: Review;
  currentUserId?: string | null;
  onDeleted?: (id: string) => void;
  onEdited?: (review: Review) => void;
};

export function ReviewCard({ review, currentUserId, onDeleted, onEdited }: ReviewCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwn = currentUserId && review.userId === currentUserId;

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  async function toggleLike() {
    const supabase = createClient();
    try {
      if (liked) {
        await unlikeReview(supabase, review.id, review.target);
        setLiked(false);
        setLikeCount((n) => Math.max(0, n - 1));
      } else {
        await likeReview(supabase, review.id, review.target);
        setLiked(true);
        setLikeCount((n) => n + 1);
      }
    } catch {
      // ignore unauthenticated
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    const supabase = createClient();
    try {
      await deleteReview(supabase, review.id, review.target);
      setDeleteConfirm(false);
      onDeleted?.(review.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  }

  const user = review.user;
  const initials = user ? getInitials(user.displayName || user.username) : '?';

  return (
    <>
      <article className="group relative bg-[#0a0a0a] border border-white/5 rounded-xl p-5 transition-all duration-300 hover:bg-[#111] hover:shadow-glow hover:-translate-y-1">
        {/* User info row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-sm font-outfit text-white flex-shrink-0 overflow-hidden shadow-md">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.displayName ?? ''} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex flex-col">
              {user ? (
                <Link href={`/user/${user.username}`} className="text-base font-outfit font-medium text-white hover:text-[#E53935] transition-colors">
                  {user.displayName || user.username}
                </Link>
              ) : (
                <span className="text-base font-outfit font-medium text-white">Anonymous</span>
              )}
              <span className="font-mono text-[#444] text-[0.7rem] uppercase tracking-widest mt-0.5">{timeAgo(review.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HalfStarDisplay rating={review.rating} size={16} />
            {isOwn && (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(p => !p)}
                  className="text-[#666] hover:text-white transition-colors px-1"
                  aria-label="Review options"
                >
                  ···
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 z-20 bg-[#111] border border-white/10 rounded-lg overflow-hidden min-w-[140px] shadow-2xl animate-fade-in">
                    <button
                      type="button"
                      className="block w-full text-left px-4 py-2.5 font-outfit text-sm text-[#e0e0e0] hover:bg-white/5 transition-colors"
                      onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                    >
                      Edit Review
                    </button>
                    <button
                      type="button"
                      className="block w-full text-left px-4 py-2.5 font-outfit text-sm text-[#E53935] hover:bg-[#E53935]/10 transition-colors border-t border-white/5"
                      onClick={() => { setMenuOpen(false); setDeleteConfirm(true); }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Item */}
        <Link href={`/item/${review.spotifyId}?type=${review.kind}`} className="flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors mb-4 group/item">
          {review.target.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.target.artworkUrl} alt={review.target.title} className="w-16 h-16 rounded shadow-md object-cover flex-shrink-0 group-hover/item:scale-105 transition-transform" />
          ) : (
            <div className="w-16 h-16 rounded bg-[#111] shadow-md flex-shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-playfair text-lg font-semibold text-white truncate">{review.target.title}</span>
            <span className="font-outfit text-sm text-[#888] truncate">{review.target.artist}</span>
          </div>
        </Link>

        {/* Body */}
        {review.body && (
          <p
            className={`font-outfit text-[#c7c7c7] text-[1.05rem] leading-[1.7] mb-4 ${review.hasSpoiler && !spoilerRevealed ? 'blur-md cursor-pointer select-none opacity-60' : ''}`}
            onClick={() => review.hasSpoiler && setSpoilerRevealed(true)}
            title={review.hasSpoiler && !spoilerRevealed ? 'Click to reveal spoiler' : undefined}
          >
            {review.body}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
          <button
            className={`inline-flex items-center gap-1.5 font-mono text-[0.8rem] rounded-md px-2.5 py-1 transition-all ${liked ? 'text-[#E53935] bg-[#E53935]/10' : 'text-[#666] hover:text-white hover:bg-white/5'}`}
            type="button"
            data-liked={liked}
            onClick={toggleLike}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            ♥ {likeCount > 0 && <span className="font-bold">{likeCount}</span>}
          </button>
          
          {review.hasSpoiler && !spoilerRevealed && (
            <span className="font-mono text-[0.7rem] uppercase tracking-wider text-[#666] bg-[#111] px-2 py-1 rounded">⚠ Spoiler</span>
          )}
        </div>
      </article>

      {/* Edit modal */}
      <ReviewModal
        target={editOpen ? review.target : null}
        initialRating={review.rating}
        initialBody={review.body ?? ''}
        initialSpoiler={review.hasSpoiler}
        existingReviewId={review.id}
        onClose={() => setEditOpen(false)}
        onSuccess={(updated) => { setEditOpen(false); onEdited?.(updated); }}
      />

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-playfair text-2xl font-semibold mb-2">Delete Review</h3>
            <p className="text-[#a0a0a0] font-outfit text-sm mb-6">Are you sure? This cannot be undone.</p>
            {deleteError && <p className="text-[#E53935] text-sm mb-4">{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                className="button px-5 py-2"
                onClick={() => { setDeleteConfirm(false); setDeleteError(''); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="button button-primary bg-[#E53935] border-[#E53935] px-5 py-2"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
