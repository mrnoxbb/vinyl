import type { Metadata } from "next";

import { RATING_STEP } from "@vinyl/shared/lib/constants";

import { PageShell } from "../../../components/PageShell";

type ItemPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  return {
    title: `Item ${params.id} | VINYL`
  };
}

export default function ItemPage({ params }: ItemPageProps) {
  return (
    <PageShell
      title={`Item ${params.id}`}
      description="This public item route is scaffolded for track, album, and artist detail pages, including reviews, stats, and related listening paths."
      eyebrow="Public"
    >
      <span className="page-pill">Rating step: {RATING_STEP}</span>
    </PageShell>
  );
}
