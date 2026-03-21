import type { ReactNode } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { DARK_PALETTE } from "@vinyl/shared/lib/constants";

type ScreenShellProps = {
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
};

export function ScreenShell({
  title,
  description,
  badge = "VINYL",
  children
}: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.badge}>{badge}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {children ? <View style={styles.meta}>{children}</View> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DARK_PALETTE.background
  },
  content: {
    flexGrow: 1,
    padding: 20
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DARK_PALETTE.border,
    backgroundColor: DARK_PALETTE.surface,
    padding: 24,
    gap: 14
  },
  badge: {
    color: DARK_PALETTE.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  title: {
    color: DARK_PALETTE.textPrimary,
    fontSize: 30,
    fontWeight: "700"
  },
  description: {
    color: DARK_PALETTE.textSecondary,
    fontSize: 16,
    lineHeight: 24
  },
  meta: {
    gap: 12,
    marginTop: 8
  }
});
