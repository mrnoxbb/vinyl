import { formatRating } from "@vinyl/shared/lib/utils";

type HalfStarDisplayProps = {
  rating: number;
};

export function HalfStarDisplay({ rating }: HalfStarDisplayProps) {
  return <span className="rating-display">{formatRating(rating)} / 5.0</span>;
}
