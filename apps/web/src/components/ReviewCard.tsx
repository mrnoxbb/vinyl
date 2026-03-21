'use client';

import { useState } from 'react';
import Link from 'next/link';

import { getInitials, timeAgo } from '@vinyl/shared/lib/utils';
import type { Review } from '@vinyl/shared/types/review';
import { likeReview, unlikeReview } from '@vinyl/shared/lib/reviews';

import { createClient } from '../lib/supabase/client';
import { HalfStarDisplay } from './HalfStarDisplay';

type ReviewCardProps = {
  review: Review;
};

export function ReviewCard({ review }: ReviewCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(review.target ? 0 : 0);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

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
      // Silently ignore — user may not be authenticated
    }
  }

  const user = review.user;
  const initials = user ? getInitials(user.displayName || user.username) : '?';

  return (
    <article className="review-card">
      {/* User info */}
      <div className="review-user">
        <div className="review-avatar">
          {user?.avatarUrl ? (
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
        <div style={{ marginLeft: 'auto' }}>
          <HalfStarDisplay rating={review.rating} size={14} />
        </div>
      </div>

      {/* Item */}
      <div className="review-item">
        {review.target.artworkUrl ? (
          <img src={review.target.artworkUrl} alt={review.target.title} className="review-artwork" />
        ) : (
          <div className="review-artwork-placeholder" />
        )}
        <div className="review-item-info">
          <Link href={`/item/${review.spotifyId}`} className="review-item-title">
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
          ♥ {likeCount > 0 && likeCount}
        </button>
        {review.hasSpoiler && !spoilerRevealed && (
          <span style={{ fontSize: '0.75rem', color: '#666' }}>⚠ Spoiler</span>
        )}
      </div>
    </article>
  );
}
