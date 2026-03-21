import type { Metadata } from "next";

import { MIN_TASTE_OVERLAP } from "@vinyl/shared/lib/constants";

import { PageShell } from "../../components/PageShell";
import { SearchBar } from "../../components/SearchBar";

export const metadata: Metadata = {
  title: "Search | VINYL"
};

export default function SearchPage() {
  return (
    <PageShell
      title="Search"
      description="Search is ready for Spotify-backed results across tracks, albums, and artists through the shared Edge Function proxy."
      eyebrow="Public"
    >
      <SearchBar />
      <span className="page-pill">Discovery threshold: {MIN_TASTE_OVERLAP}</span>
    </PageShell>
  );
}
