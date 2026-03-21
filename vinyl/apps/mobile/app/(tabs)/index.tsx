import { Text } from "react-native";

import { fetchGlobalFeed } from "@vinyl/shared/lib/reviews";
import { formatRating } from "@vinyl/shared/lib/utils";

import { ScreenShell } from "../ScreenShell";

export default function HomeScreen() {
  const sharedFeedReady = typeof fetchGlobalFeed === "function";

  return (
    <ScreenShell
      title="Home Feed"
      description="The mobile home feed is scaffolded for following activity, fresh reviews, and quick capture actions."
      badge="Protected"
    >
      <Text style={{ color: "#f5f5f5" }}>Shared feed import ready: {sharedFeedReady ? "yes" : "no"}</Text>
      <Text style={{ color: "#c7c7c7" }}>Sample half-step rating: {formatRating(4.5)}</Text>
    </ScreenShell>
  );
}
