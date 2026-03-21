import type { Metadata } from "next";

import { createDiaryEntry } from "@vinyl/shared/lib/diary";

import { PageShell } from "../../components/PageShell";

export const metadata: Metadata = {
  title: "Diary | VINYL"
};

export default function DiaryPage() {
  return (
    <PageShell
      title="Listening Diary"
      description="The diary route is set up for private listen logging, quick notes, and date-based recap views."
      eyebrow="Protected"
    >
      <span className="page-pill">Diary API ready: {typeof createDiaryEntry === "function" ? "yes" : "no"}</span>
    </PageShell>
  );
}
