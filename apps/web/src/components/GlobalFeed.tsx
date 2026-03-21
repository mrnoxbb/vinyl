'use client';

import { useEffect, useState } from 'react';

import type { Review } from '@vinyl/shared/types/review';

import { createClient } from '../lib/supabase/client';
import { ReviewCard } from './ReviewCard';

type Props = {
  initialReviews: Review[];
};

export function GlobalFeed({ initialReviews }: Props) {
  const [reviews, setReviews] = useState(initialReviews);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  function handleDeleted(id: string) {
    setReviews(prev => prev.filter(r => r.id !== id));
  }

  function handleEdited(updated: Review) {
    setReviews(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#a0a0a0]">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map(r => (
        <ReviewCard
          key={r.id}
          review={r}
          currentUserId={currentUserId}
          onDeleted={handleDeleted}
          onEdited={handleEdited}
        />
      ))}
    </div>
  );
}
