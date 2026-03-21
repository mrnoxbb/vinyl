"use client";

import { useState } from "react";

import { MAX_REVIEW_BODY } from "@vinyl/shared/lib/constants";
import type { ReviewTarget } from "@vinyl/shared/types/review";

import { StarRating } from "./StarRating";

type ReviewModalProps = {
  open: boolean;
  target: ReviewTarget;
  initialRating?: number;
  onClose?: () => void;
  onSubmit?: (payload: { rating: number; body: string }) => void;
};

export function ReviewModal({
  open,
  target,
  initialRating = 4,
  onClose,
  onSubmit
}: ReviewModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [body, setBody] = useState("");

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div>
          <p className="page-eyebrow">Draft Review</p>
          <h2 className="modal-title">{target.title}</h2>
          <p className="page-description">{target.artist}</p>
        </div>
        <StarRating value={rating} onChange={setRating} />
        <textarea
          className="modal-textarea"
          maxLength={MAX_REVIEW_BODY}
          placeholder="Write a quick first impression, standout lyric, or context for the rating."
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="modal-actions">
          <button className="button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => onSubmit?.({ rating, body })}
          >
            Save Review
          </button>
        </div>
      </div>
    </div>
  );
}
