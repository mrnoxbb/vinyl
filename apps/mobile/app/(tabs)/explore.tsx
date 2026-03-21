import { Text } from "react-native";

import { fetchMostReviewedWeek } from "@vinyl/shared/lib/discovery";

import { ScreenShell } from "../ScreenShell";

export default function ExploreScreen() {
  return (
    <ScreenShell
      title="Explore"
      description="This tab is ready for most-reviewed charts, hidden gems, and hot-right-now discoveries."
      badge="Public"
    >
      <Text style={{ color: "#f5f5f5" }}>
        Discovery API ready: {typeof fetchMostReviewedWeek === "function" ? "yes" : "no"}
      </Text>
    </ScreenShell>
  );
}
