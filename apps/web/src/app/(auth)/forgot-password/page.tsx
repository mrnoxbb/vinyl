import type { Metadata } from "next";

import { MAX_REVIEW_BODY } from "@vinyl/shared/lib/constants";

import { PageShell } from "../../../components/PageShell";

export const metadata: Metadata = {
  title: "Forgot Password | VINYL"
};

export default function ForgotPasswordPage() {
  return (
    <PageShell
      title="Reset Password"
      description="Password recovery is scaffolded for Supabase email resets, with room for branded messaging and redirect handling."
      eyebrow="Auth"
    >
      <span className="page-pill">Review body max: {MAX_REVIEW_BODY} chars</span>
    </PageShell>
  );
}
