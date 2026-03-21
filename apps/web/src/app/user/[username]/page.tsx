import type { Metadata } from "next";

import type { UserLevel } from "@vinyl/shared/types/user";

import { PageShell } from "../../../components/PageShell";

type UserPageProps = {
  params: {
    username: string;
  };
};

const starterLevel: UserLevel = "Listener";

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  return {
    title: `${params.username} | VINYL`
  };
}

export default function UserPage({ params }: UserPageProps) {
  return (
    <PageShell
      title={`@${params.username}`}
      description="Public profiles are ready for pinned favorites, recent reviews, level progression, and follow actions."
      eyebrow="Public"
    >
      <span className="page-pill">Default level scaffold: {starterLevel}</span>
    </PageShell>
  );
}
