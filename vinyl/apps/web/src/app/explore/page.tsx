import type { Metadata } from "next";

import { fetchHotRightNow } from "@vinyl/shared/lib/discovery";

import { PageShell } from "../../components/PageShell";

export const metadata: Metadata = {
  title: "Explore | VINYL"
};

export default function ExplorePage() {
  return (
    <PageShell
      title="Explore"
      description="The explore surface is scaffolded for most-reviewed charts, hidden gems, and velocity-based hot lists."
      eyebrow="Public"
    >
      <span className="page-pill">Discovery view import ready: {typeof fetchHotRightNow === "function" ? "yes" : "no"}</span>
    </PageShell>
  );
}
