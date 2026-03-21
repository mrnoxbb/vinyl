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
          <div ref={panelRef} className="modal-panel" style={{ maxWidth: 440, textAlign: 'center', padding: '3.5rem 2rem' }}>
            <div style={{ fontSize: 64, marginBottom: 16, animation: 'pulse-slow 2s infinite' }}>🔥</div>
            <h2 style={{ fontFamily: 'var(--font-playfair)', color: '#fff', fontSize: '2.5rem', fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              {milestoneCelebration}-Day Streak
            </h2>
            <p style={{ fontFamily: 'var(--font-outfit)', color: '#a0a0a0', fontSize: '1.05rem', margin: '0 0 16px' }}>
              You've reviewed music {milestoneCelebration} days in a row.
            </p>
            {badgeLabel && (
              <p style={{ fontFamily: 'var(--font-mono)', color: '#E53935', fontSize: '0.85rem', marginBottom: 32, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                🏆 You earned the {milestoneLabel}-Day Streak badge!
              </p>
            )}
            <button
              className="button button-primary"
              onClick={() => { setMilestoneCelebration(0); onClose(); }}
              style={{ minWidth: 140, margin: '0 auto', display: 'flex' }}
            >
              Continue
            </button>
          </div>
        </div>
      </>
    );
  }

  const remaining = MAX_REVIEW_BODY - body.length;
  const nearLimit = remaining < 40;
  const isEdit = Boolean(existingReviewId);

  return (
    <>
    {streakToast > 0 && <StreakToast streak={streakToast} onDone={() => setStreakToast(0)} />}
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={handleBackdropClick}>
      <div ref={panelRef} className="modal-panel" style={{ maxWidth: 540, padding: 0, overflow: 'hidden', background: '#0a0a0a' }}>
        {/* Header - Album hero feel */}
        <div style={{ position: 'relative', padding: '2.5rem 2.5rem 1.5rem', background: 'linear-gradient(to bottom, rgba(15,15,15,0.8), #0a0a0a)' }}>
          {target.artworkUrl && (
            <div style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 200, backgroundImage: `url(${target.artworkUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(60px) opacity(0.15)', pointerEvents: 'none', zIndex: 0 }}></div>
          )}
          
          <button
            type="button"
            onClick={onClose}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', color: '#a0a0a0', cursor: 'pointer', fontSize: '1.2rem', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, transition: 'all 0.2s' }}
            aria-label="Close"
            onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#a0a0a0'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            ×
          </button>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative', zIndex: 5 }}>
            {target.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={target.artworkUrl} alt={target.title} style={{ width: 80, height: 80, borderRadius: 6, objectFit: 'cover', flexShrink: 0, boxShadow: '0 12px 24px rgba(0,0,0,0.6)' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: 6, background: '#111', flexShrink: 0, boxShadow: '0 12px 24px rgba(0,0,0,0.6)' }} />
            )}
            <div style={{ minWidth: 0, paddingTop: '0.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#E53935', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
                {isEdit ? 'Editing Review' : target.kind}
              </p>
              <h2 style={{ margin: '0.5rem 0 0', fontFamily: 'var(--font-playfair)', fontSize: '1.6rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                {target.title}
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontFamily: 'var(--font-outfit)', fontSize: '0.95rem', color: '#a0a0a0' }}>{target.artist}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ padding: '0 2.5rem' }}>
            {/* Star rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <StarRating rating={rating} onChange={setRating} size={36} />
              {rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(229,57,53,0.1)', padding: '0.35rem 0.75rem', borderRadius: 999, border: '1px solid rgba(229,57,53,0.2)' }}>
                  <HalfStarDisplay rating={rating} size={14} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#E53935', fontWeight: 600 }}>
                    {rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Review body - Journal style */}
            <div style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
              <textarea
                className="modal-textarea"
                maxLength={MAX_REVIEW_BODY}
                placeholder="What did this make you feel? (optional)"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ resize: 'none', background: 'transparent', border: 'none', boxShadow: 'none', padding: '0', fontSize: '1.1rem', lineHeight: 1.6, fontFamily: 'var(--font-playfair)', color: '#e0e0e0' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                {/* Spoiler toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontFamily: 'var(--font-outfit)', fontSize: '0.85rem', color: '#888' }}>
                  <input
                    type="checkbox"
                    checked={hasSpoiler}
                    onChange={(e) => setHasSpoiler(e.target.checked)}
                    style={{ accentColor: '#E53935', width: 16, height: 16 }}
                  />
                  Contains spoilers
                </label>
                
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: nearLimit ? '#E53935' : '#444' }}>
                  {remaining}
                </span>
              </div>
            </div>

            {error && <p style={{ margin: '1rem 0 0', color: '#E53935', fontFamily: 'var(--font-outfit)', fontSize: '0.9rem' }}>{error}</p>}
          </div>

          {/* Actions */}
          <div style={{ marginTop: '2rem', padding: '1.5rem 2.5rem', background: 'rgba(5,5,5,0.5)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="button" type="button" onClick={onClose} disabled={loading} style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)' }}>
              Cancel
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={rating === 0 || loading}
            >
              {loading ? (isEdit ? 'Saving…' : 'Publishing…') : (isEdit ? 'Save Changes' : 'Publish Review')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
