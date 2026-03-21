import { Tabs } from "expo-router";

import { DARK_PALETTE } from "@vinyl/shared/lib/constants";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: DARK_PALETTE.background
        },
        headerTintColor: DARK_PALETTE.textPrimary,
        tabBarStyle: {
          backgroundColor: DARK_PALETTE.surface,
          borderTopColor: DARK_PALETTE.border
        },
        tabBarActiveTintColor: DARK_PALETTE.accent,
        tabBarInactiveTintColor: DARK_PALETTE.textMuted
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
