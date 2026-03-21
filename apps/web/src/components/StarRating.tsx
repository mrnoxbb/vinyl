'use client';

import { useState } from 'react';
import { getRatingLabel } from '@vinyl/shared/lib/utils';

type StarRatingProps = {
  rating: number;
  onChange: (rating: number) => void;
  readonly?: boolean;
  size?: number;
};

const STAR_COUNT = 5;

export function StarRating({ rating, onChange, readonly = false, size = 32 }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  const displayed = hover || rating;
  const label = displayed > 0 ? getRatingLabel(displayed) : '';

  function valueFromEvent(starIndex: number, isLeftHalf: boolean): number {
    return isLeftHalf ? starIndex - 0.5 : starIndex;
  }

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>, starIndex: number) {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;
    setHover(valueFromEvent(starIndex, isLeft));
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>, starIndex: number) {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;
    onChange(valueFromEvent(starIndex, isLeft));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (readonly) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, rating + 0.5));
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(0.5, rating - 0.5));
    }
  }

  return (
    <div
      className="star-rating-wrap"
      onMouseLeave={() => !readonly && setHover(0)}
      onKeyDown={handleKeyDown}
      tabIndex={readonly ? -1 : 0}
      role={readonly ? undefined : 'slider'}
      aria-label="Star rating"
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={rating}
    >
      <div className="star-row" style={{ gap: 4 }}>
        {Array.from({ length: STAR_COUNT }, (_, i) => {
          const starIndex = i + 1;
          const fill = Math.min(Math.max(displayed - i, 0), 1); // 0, 0.5, or 1

          return (
            <button
              key={starIndex}
              type="button"
              className="star-btn"
              style={{ width: size, height: size, position: 'relative', padding: 0, background: 'none', border: 'none', cursor: readonly ? 'default' : 'pointer' }}
              onMouseMove={(e) => handleMouseMove(e, starIndex)}
              onClick={(e) => handleClick(e, starIndex)}
              aria-hidden="true"
              tabIndex={-1}
            >
              <StarSvg size={size} fill={fill} />
            </button>
          );
        })}
      </div>
      {label && (
        <span style={{ fontSize: 13, color: '#7F77DD', minWidth: 64 }}>{label}</span>
      )}
    </div>
  );
}

function StarSvg({ size, fill }: { size: number; fill: number }) {
  const id = `star-clip-${Math.round(fill * 10)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      {/* Background (empty) star */}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="#2a2a2a"
      />
      {/* Filled portion */}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="#534AB7"
        clipPath={`url(#${id})`}
      />
    </svg>
  );
}
