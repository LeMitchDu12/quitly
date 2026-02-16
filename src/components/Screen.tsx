import React from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  inner: { flex: 1, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm },
});
