'use client';

import { useEffect, useRef, useState } from 'react';

import { MAX_REVIEW_BODY } from '@vinyl/shared/lib/constants';
import type { Review, ReviewTarget } from '@vinyl/shared/types/review';
import { submitReview, updateReview } from '@vinyl/shared/lib/reviews';

import { createClient } from '../lib/supabase/client';
import { HalfStarDisplay } from './HalfStarDisplay';
import { StarRating } from './StarRating';

const STREAK_MILESTONES = new Set([7, 30, 100]);
const MILESTONE_BADGE: Record<number, string> = {
  7: 'streak_7',
  30: 'streak_30',
  100: 'streak_100',
};

// Simple toast shown at bottom-right
function StreakToast({ streak, onDone }: { streak: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, background: '#111111', border: '1px solid #BA7517', borderRadius: 12, padding: '12px 16px', color: '#BA7517', fontSize: '0.875rem', fontWeight: 500, animation: 'fadeIn 0.3s ease' }}>
      🔥 {streak} day streak!
    </div>
  );
}

type ReviewModalProps = {
  target: ReviewTarget | null;
  onClose: () => void;
  onSuccess: (review: Review) => void;
  // Edit mode
  initialRating?: number;
  initialBody?: string;
  initialSpoiler?: boolean;
  existingReviewId?: string;
};

export function ReviewModal({
  target,
  onClose,
  onSuccess,
  initialRating,
  initialBody,
  initialSpoiler,
  existingReviewId,
}: ReviewModalProps) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [body, setBody] = useState(initialBody ?? '');
  const [hasSpoiler, setHasSpoiler] = useState(initialSpoiler ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [streakToast, setStreakToast] = useState(0); // non-milestone streak
  const [milestoneCelebration, setMilestoneCelebration] = useState(0); // milestone streak
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync when edit props change
  useEffect(() => {
    if (target) {
      setRating(initialRating ?? 0);
      setBody(initialBody ?? '');
      setHasSpoiler(initialSpoiler ?? false);
      setError('');
    }
  }, [target?.spotifyId, existingReviewId]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target || rating === 0) return;
    setError('');
    setLoading(true);
    const supabase = createClient();
    try {
      // Content moderation — only check if body is non-empty
      if (body.trim()) {
        const filterResult = await supabase.functions.invoke('filter-review-body', {
          body: { body: body.trim() },
        });
        if (filterResult.data?.flagged) {
          setError('Your review contains content that violates our community guidelines. Please revise it.');
          setLoading(false);
          return;
        }
      }

      let review: Review;
      if (existingReviewId) {
        review = await updateReview(supabase, existingReviewId, target, { rating, body: body || null, hasSpoiler });
      } else {
        review = await submitReview(supabase, target, { rating, body: body || null, hasSpoiler });
      }
      onSuccess(review);

      // Check streak after successful submit (new reviews only)
      if (!existingReviewId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('review_streak')
            .eq('id', user.id)
            .single();
          const streak = Number(userData?.review_streak ?? 0);
          if (streak > 1) {
            if (STREAK_MILESTONES.has(streak)) {
              setMilestoneCelebration(streak);
              return; // Don't close modal yet — show celebration first
            } else {
              setStreakToast(streak);
            }
          }
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!target) return null;

  // Milestone celebration replaces modal content briefly
  if (milestoneCelebration > 0) {
    const badgeLabel = MILESTONE_BADGE[milestoneCelebration];
    const milestoneLabel = badgeLabel?.replace('streak_', '').replace('_', '-');
    return (
      <>
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div ref={panelRef} className="modal-panel" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔥</div>
            <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px' }}>
              {milestoneCelebration}-Day Streak!
            </h2>
            <p style={{ color: '#a0a0a0', fontSize: '0.95rem', margin: '0 0 12px' }}>
              You&apos;ve reviewed music {milestoneCelebration} days in a row
            </p>
            {badgeLabel && (
              <p style={{ color: '#BA7517', fontSize: '0.875rem', marginBottom: 20 }}>
                🏆 You earned the {milestoneLabel}-Day Streak badge!
              </p>
            )}
            <button
              className="button button-primary"
              onClick={() => { setMilestoneCelebration(0); onClose(); }}
              style={{ minWidth: 120 }}
            >
              Continue
            </button>
          </div>
        </div>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
      </>
    );
  }

  const remaining = MAX_REVIEW_BODY - body.length;
  const nearLimit = remaining < 40;
  const isEdit = Boolean(existingReviewId);

  return (
    <>
    {streakToast > 0 && <StreakToast streak={streakToast} onDone={() => setStreakToast(0)} />}
    <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={handleBackdropClick}>
      <div ref={panelRef} className="modal-panel" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', minWidth: 0 }}>
            {target.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={target.artworkUrl} alt={target.title} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 8, background: '#1a1a1a', flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                {isEdit ? 'Editing review' : target.kind}
              </p>
              <h2 style={{ margin: '0.15rem 0 0', fontSize: '1.1rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {target.title}
              </h2>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.85rem', color: '#a0a0a0' }}>{target.artist}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1, padding: '0.25rem', flexShrink: 0 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          {/* Star rating */}
          <div>
            <StarRating rating={rating} onChange={setRating} size={32} />
            {rating > 0 && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#7F77DD' }}>
                <HalfStarDisplay rating={rating} size={12} showLabel />
              </p>
            )}
          </div>

          {/* Review body */}
          <div style={{ position: 'relative' }}>
            <textarea
              className="modal-textarea"
              maxLength={MAX_REVIEW_BODY}
              placeholder="Write your review… (optional)"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            <span style={{
              position: 'absolute', bottom: '0.6rem', right: '0.75rem',
              fontSize: '0.75rem', color: nearLimit ? '#E24B4A' : '#666',
              pointerEvents: 'none',
            }}>
              {remaining}
            </span>
          </div>

          {/* Spoiler toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#a0a0a0' }}>
            <input
              type="checkbox"
              checked={hasSpoiler}
              onChange={(e) => setHasSpoiler(e.target.checked)}
              style={{ accentColor: '#534AB7' }}
            />
            Contains spoilers
          </label>

          {error && <p style={{ margin: 0, color: '#E24B4A', fontSize: '0.85rem' }}>{error}</p>}

          {/* Actions */}
          <div className="modal-actions">
            <button className="button" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={rating === 0 || loading}
            >
              {loading ? (isEdit ? 'Saving…' : 'Posting…') : (isEdit ? 'Save Changes' : 'Post Review')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
