import type { Metadata } from "next";

import { fetchNotifications } from "@vinyl/shared/lib/notifications";

import { PageShell } from "../../components/PageShell";

export const metadata: Metadata = {
  title: "Notifications | VINYL"
};

export default function NotificationsPage() {
  return (
    <PageShell
      title="Notifications"
      description="The notification center is scaffolded for new followers, likes, and review activity with per-user settings support."
      eyebrow="Protected"
    >
      <span className="page-pill">Notification API ready: {typeof fetchNotifications === "function" ? "yes" : "no"}</span>
    </PageShell>
  );
}
