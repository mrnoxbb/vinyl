import { Text } from "react-native";

import type { UserLevel } from "@vinyl/shared/types/user";

import { ScreenShell } from "../ScreenShell";

const starterLevel: UserLevel = "Listener";

export default function ProfileScreen() {
  return (
    <ScreenShell
      title="Profile"
      description="Public profile scaffolding is ready for stats, pinned favorites, and follow controls."
      badge="Public"
    >
      <Text style={{ color: "#f5f5f5" }}>Starter level scaffold: {starterLevel}</Text>
    </ScreenShell>
  );
}
