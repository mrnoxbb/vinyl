import { StyleSheet, Text, TextInput } from "react-native";

import { MIN_TASTE_OVERLAP } from "@vinyl/shared/lib/constants";

import { ScreenShell } from "../ScreenShell";

export default function SearchScreen() {
  return (
    <ScreenShell
      title="Search"
      description="Search is scaffolded for Spotify-backed lookup across tracks, albums, and artists."
      badge="Public"
    >
      <TextInput
        placeholder="Search music"
        placeholderTextColor="#8b8b8b"
        style={styles.input}
      />
      <Text style={styles.copy}>Taste overlap hint: {MIN_TASTE_OVERLAP} shared ratings.</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3b3b3b",
    backgroundColor: "#111111",
    color: "#f5f5f5",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  copy: {
    color: "#c7c7c7",
    fontSize: 15
  }
});
