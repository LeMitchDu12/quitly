import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: theme.spacing.sm,
  },
  icon: { fontSize: 18, marginBottom: 6 },
  value: { color: theme.colors.textPrimary, fontSize: theme.typography.h3.fontSize, fontWeight: "700" },
  label: { color: theme.colors.textSecondary, fontSize: theme.typography.small.fontSize, marginTop: 2 },
});
