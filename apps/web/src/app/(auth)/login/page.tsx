import type { Metadata } from "next";

import { DARK_PALETTE } from "@vinyl/shared/lib/constants";

import { PageShell } from "../../../components/PageShell";

export const metadata: Metadata = {
  title: "Login | VINYL"
};

export default function LoginPage() {
  return (
    <PageShell
      title="Log In"
      description="Email and password authentication will connect here, with Supabase session handling for the protected feed and personal spaces."
      eyebrow="Auth"
    >
      <span className="page-pill">Canvas color: {DARK_PALETTE.background}</span>
    </PageShell>
  );
}
