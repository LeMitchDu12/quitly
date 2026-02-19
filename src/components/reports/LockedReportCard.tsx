import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";

export default function LockedReportCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.blurLayer} />
      <View style={styles.content}>
        <View style={styles.lockRow}>
          <Ionicons name="lock-closed" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.lg,
    padding: 16,
    overflow: "hidden",
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.04)",
    opacity: 0.35,
  },
  content: {
    opacity: 0.9,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.textTertiary,
    marginTop: 8,
    fontSize: 12,
  },
});
