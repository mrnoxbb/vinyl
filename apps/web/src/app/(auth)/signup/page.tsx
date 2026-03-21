import type { Metadata } from "next";

import { MIN_TASTE_OVERLAP } from "@vinyl/shared/lib/constants";

import { PageShell } from "../../../components/PageShell";

export const metadata: Metadata = {
  title: "Sign Up | VINYL"
};

export default function SignupPage() {
  return (
    <PageShell
      title="Create Account"
      description="The signup flow is scaffolded for username-first onboarding, so new listeners can land in VINYL with a public handle right away."
      eyebrow="Auth"
    >
      <span className="page-pill">Taste overlap threshold: {MIN_TASTE_OVERLAP}</span>
    </PageShell>
  );
}
