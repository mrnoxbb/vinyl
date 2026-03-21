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
      <article className="review-card">
        {/* User info row */}
        <div className="review-user">
          <div className="review-avatar">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.displayName} />
            ) : (
              initials
            )}
          </div>
          <div className="review-meta">
            {user ? (
              <Link href={`/user/${user.username}`} className="review-username">
                {user.displayName || user.username}
              </Link>
            ) : (
              <span className="review-username">Anonymous</span>
            )}
            <span className="review-time">{timeAgo(review.createdAt)}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HalfStarDisplay rating={review.rating} size={14} />
            {isOwn && (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(p => !p)}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                  aria-label="Review options"
                >
                  ···
                </button>
                {menuOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', zIndex: 20,
                    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
                    minWidth: 120, overflow: 'hidden', marginTop: 4,
                  }}>
                    <button
                      type="button"
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}
                      onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 1rem', background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '0.875rem' }}
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
        <div className="review-item">
          {review.target.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.target.artworkUrl} alt={review.target.title} className="review-artwork" />
          ) : (
            <div className="review-artwork-placeholder" />
          )}
          <div className="review-item-info">
            <Link href={`/item/${review.spotifyId}?type=${review.kind}`} className="review-item-title">
              {review.target.title}
            </Link>
            <span className="review-item-artist">{review.target.artist}</span>
          </div>
        </div>

        {/* Body */}
        {review.body && (
          <p
            className={`review-body${review.hasSpoiler && !spoilerRevealed ? ' review-body-blurred' : ''}`}
            onClick={() => review.hasSpoiler && setSpoilerRevealed(true)}
            title={review.hasSpoiler && !spoilerRevealed ? 'Click to reveal spoiler' : undefined}
          >
            {review.body}
          </p>
        )}

        {/* Actions */}
        <div className="review-actions">
          <button
            className="like-button"
            type="button"
            data-liked={liked}
            onClick={toggleLike}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            ♥{likeCount > 0 ? ` ${likeCount}` : ''}
          </button>
          {review.hasSpoiler && !spoilerRevealed && (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>⚠ Spoiler</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-1">Delete this review?</h3>
            <p className="text-[#a0a0a0] text-sm mb-4">This cannot be undone.</p>
            {deleteError && <p className="text-[#E24B4A] text-sm mb-3">{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                className="border border-[#2a2a2a] text-[#a0a0a0] rounded-lg px-4 py-2 text-sm hover:border-[#333] transition-colors"
                onClick={() => { setDeleteConfirm(false); setDeleteError(''); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="bg-[#E24B4A] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#c43f3e] transition-colors"
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
