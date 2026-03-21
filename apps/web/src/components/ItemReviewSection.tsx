'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Review, ReviewTarget } from '@vinyl/shared/types/review';
import { deleteReview, fetchItemReviews } from '@vinyl/shared/lib/reviews';
import { getInitials, getRatingLabel, timeAgo } from '@vinyl/shared/lib/utils';

import { createClient } from '../lib/supabase/client';
import { HalfStarDisplay } from './HalfStarDisplay';
import { ReviewModal } from './ReviewModal';

type Stats = { avgRating: number; reviewCount: number; distribution: Record<string, number> };

type Props = {
  target: ReviewTarget;
  initialReviews: Review[];
  initialStats: Stats;
  currentUserId: string | null;
};

export function ItemReviewSection({ target, initialReviews, initialStats, currentUserId }: Props) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [stats, setStats] = useState(initialStats);
  const [sort, setSort] = useState<'helpful' | 'recent'>('helpful');
  const [modalOpen, setModalOpen] = useState(false);
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState<Set<string>>(new Set());

  const sorted = [...reviews].sort((a, b) =>
    sort === 'helpful'
      ? (b.helpfulVotes - a.helpfulVotes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const userReview = currentUserId ? reviews.find(r => r.userId === currentUserId) : null;

  function handleReviewSuccess(review: Review) {
    setReviews(prev => {
      const existing = prev.findIndex(r => r.id === review.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = review;
        return next;
      }
      return [review, ...prev];
    });
    setStats(prev => ({
      ...prev,
      reviewCount: prev.reviewCount + (userReview ? 0 : 1),
    }));
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    const supabase = createClient();
    try {
      await deleteReview(supabase, deleteTarget.id, deleteTarget.target);
      setReviews(prev => prev.filter(r => r.id !== deleteTarget.id));
      setStats(prev => ({ ...prev, reviewCount: Math.max(0, prev.reviewCount - 1) }));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete review.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Write a review CTA */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          Community reviews ({stats.reviewCount})
        </h2>
        {currentUserId && (
          <button
            className="bg-[#534AB7] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#4a42a3] transition-colors"
            onClick={() => { setEditReview(null); setModalOpen(true); }}
          >
            {userReview ? 'Edit Review' : 'Write a Review'}
          </button>
        )}
        {!currentUserId && (
          <a href="/login" className="border border-[#534AB7] text-[#534AB7] rounded-lg px-4 py-2 text-sm hover:bg-[#534AB7] hover:text-white transition-colors">
            Sign in to review
          </a>
        )}
      </div>

      {/* User's existing review highlight */}
      {userReview && (
        <div className="bg-[#534AB7]/10 border border-[#534AB7]/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#7F77DD] font-semibold uppercase tracking-wide">Your review</span>
            <div className="flex gap-2">
              <button
                className="text-[#a0a0a0] text-sm hover:text-white transition-colors"
                onClick={() => { setEditReview(userReview); setModalOpen(true); }}
              >
                Edit
              </button>
              <button
                className="text-[#E24B4A] text-sm hover:bg-[#E24B4A]/10 px-2 py-0.5 rounded transition-colors"
                onClick={() => setDeleteTarget(userReview)}
              >
                Delete
              </button>
            </div>
          </div>
          <HalfStarDisplay rating={userReview.rating} size={16} showLabel />
          {userReview.body && (
            <p className="text-[#a0a0a0] text-sm mt-2">{userReview.body}</p>
          )}
        </div>
      )}

      {/* Sort controls */}
      {reviews.length > 1 && (
        <div className="flex gap-3 mb-4">
          {(['helpful', 'recent'] as const).map(s => (
            <button
              key={s}
              className={`text-sm px-3 py-1 rounded-lg transition-colors ${sort === s ? 'bg-[#534AB7] text-white' : 'text-[#a0a0a0] hover:text-white'}`}
              onClick={() => setSort(s)}
            >
              {s === 'helpful' ? 'Most helpful' : 'Most recent'}
            </button>
          ))}
        </div>
      )}

      {/* Reviews list */}
      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#a0a0a0] text-base mb-3">Be the first to review {target.title}</p>
          {currentUserId && (
            <button
              className="bg-[#534AB7] text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-[#4a42a3] transition-colors"
              onClick={() => setModalOpen(true)}
            >
              Write a Review
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map(review => {
            const isOwn = review.userId === currentUserId;
            const revealed = spoilerRevealed.has(review.id);
            const initials = review.user ? getInitials(review.user.displayName || review.user.username) : '?';

            return (
              <article key={review.id} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#534AB7] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
                      {review.user?.avatarUrl
                        ? <img src={review.user.avatarUrl} alt={review.user.displayName} className="w-full h-full object-cover" />
                        : initials}
                    </div>
                    <div>
                      <a href={`/user/${review.user?.username ?? ''}`} className="text-sm font-semibold text-white hover:text-[#7F77DD] transition-colors">
                        {review.user?.displayName || review.user?.username || 'Anonymous'}
                      </a>
                      {review.user?.level && (
                        <span className="ml-2 text-xs text-[#534AB7] bg-[#534AB7]/10 px-1.5 py-0.5 rounded">
                          {review.user.level}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#666] text-xs">{timeAgo(review.createdAt)}</span>
                    {isOwn && (
                      <div className="flex gap-1">
                        <button
                          className="text-[#a0a0a0] text-xs hover:text-white px-2 py-0.5 rounded transition-colors"
                          onClick={() => { setEditReview(review); setModalOpen(true); }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-[#E24B4A] text-xs hover:bg-[#E24B4A]/10 px-2 py-0.5 rounded transition-colors"
                          onClick={() => setDeleteTarget(review)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                  <HalfStarDisplay rating={review.rating} size={14} />
                  <span className="text-xs text-[#7F77DD]">{getRatingLabel(review.rating)}</span>
                </div>

                {/* Body */}
                {review.body && (
                  <p
                    className={`text-[#a0a0a0] text-sm leading-relaxed ${review.hasSpoiler && !revealed ? 'blur-sm cursor-pointer select-none' : ''}`}
                    onClick={() => review.hasSpoiler && setSpoilerRevealed(prev => new Set([...prev, review.id]))}
                    title={review.hasSpoiler && !revealed ? 'Click to reveal spoiler' : undefined}
                  >
                    {review.body}
                  </p>
                )}
                {review.hasSpoiler && !revealed && (
                  <p className="text-xs text-[#666] mt-1">⚠ Contains spoilers — click to reveal</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Review modal (new + edit) */}
      <ReviewModal
        target={modalOpen ? target : null}
        initialRating={editReview?.rating}
        initialBody={editReview?.body ?? ''}
        initialSpoiler={editReview?.hasSpoiler ?? false}
        existingReviewId={editReview?.id}
        onClose={() => { setModalOpen(false); setEditReview(null); }}
        onSuccess={handleReviewSuccess}
      />

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-1">Delete this review?</h3>
            <p className="text-[#a0a0a0] text-sm mb-4">This cannot be undone.</p>
            {deleteError && <p className="text-[#E24B4A] text-sm mb-3">{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                className="border border-[#2a2a2a] text-[#a0a0a0] rounded-lg px-4 py-2 text-sm hover:border-[#333] transition-colors"
                onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
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
