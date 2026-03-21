import type { Metadata } from "next";

import { fetchGlobalFeed } from "@vinyl/shared/lib/reviews";
import { formatRating } from "@vinyl/shared/lib/utils";

import { PageShell } from "../components/PageShell";

export const metadata: Metadata = {
  title: "Home | VINYL"
};

export default function HomePage() {
  const sharedFeedReady = typeof fetchGlobalFeed === "function";

  return (
    <PageShell
      title="Home Feed"
      description="This protected route is ready for the personalized VINYL feed, with following activity, fresh reviews, and discovery modules."
      eyebrow="Protected"
    >
      <span className="page-pill">Shared feed import ready: {sharedFeedReady ? "yes" : "no"}</span>
      <span className="page-pill">Half-step ratings: {formatRating(4.5)}</span>
    </PageShell>
  );
}
