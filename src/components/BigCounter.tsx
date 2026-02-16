import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function BigCounter({ number, label }: { number: number; label: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.num}>{number}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg },
  num: { color: theme.colors.textPrimary, fontSize: theme.typography.h1.fontSize, fontWeight: "800" },
  label: { color: theme.colors.textSecondary, fontSize: theme.typography.body.fontSize, marginTop: 6 },
});
