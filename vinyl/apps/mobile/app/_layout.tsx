import "react-native-gesture-handler";
import "react-native-reanimated";

import { Stack } from "expo-router";

import { DARK_PALETTE } from "@vinyl/shared/lib/constants";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: DARK_PALETTE.background
        },
        headerTintColor: DARK_PALETTE.textPrimary,
        contentStyle: {
          backgroundColor: DARK_PALETTE.background
        }
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
