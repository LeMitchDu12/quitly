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
    backgroundColor: theme.colors.elevated,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  icon: {
    fontSize: 18,
    marginBottom: 6,
    color: theme.colors.primary,
  },
  value: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: "800" },
  label: { color: theme.colors.textSecondary, fontSize: theme.typography.small.fontSize, marginTop: 4 },
});
