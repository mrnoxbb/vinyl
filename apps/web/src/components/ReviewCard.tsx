import { timeAgo } from "@vinyl/shared/lib/utils";
import type { Review } from "@vinyl/shared/types/review";

import { HalfStarDisplay } from "./HalfStarDisplay";

type ReviewCardProps = {
  review: Review;
};

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <article className="review-card">
      <div className="review-card-header">
        <div>
          <p className="page-eyebrow">{review.kind}</p>
          <h2 className="review-card-title">{review.target.title}</h2>
        </div>
        <HalfStarDisplay rating={review.rating} />
      </div>
      <p className="review-card-copy">
        {review.body ?? `${review.target.artist} review stub ready for real content.`}
      </p>
      <span className="page-pill">{timeAgo(review.createdAt)}</span>
    </article>
  );
}
