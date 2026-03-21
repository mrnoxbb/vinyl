"use client";

import { RATING_STEP } from "@vinyl/shared/lib/constants";
import { formatRating } from "@vinyl/shared/lib/utils";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
};

const options = Array.from({ length: 10 }, (_, index) => (index + 1) * RATING_STEP);

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="rating-row" aria-label="Rating picker">
      {options.map((option) => (
        <button
          key={option}
          className="rating-button"
          data-active={option === value}
          type="button"
          onClick={() => onChange?.(option)}
        >
          {formatRating(option)}
        </button>
      ))}
    </div>
  );
}
