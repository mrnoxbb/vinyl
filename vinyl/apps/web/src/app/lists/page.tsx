import type { Metadata } from "next";

import { createList } from "@vinyl/shared/lib/lists";

import { PageShell } from "../../components/PageShell";

export const metadata: Metadata = {
  title: "Lists | VINYL"
};

export default function ListsPage() {
  return (
    <PageShell
      title="Lists"
      description="This protected route is ready for ranked lists, editorial curation, and collaborative list experiments."
      eyebrow="Protected"
    >
      <span className="page-pill">List API ready: {typeof createList === "function" ? "yes" : "no"}</span>
    </PageShell>
  );
}
