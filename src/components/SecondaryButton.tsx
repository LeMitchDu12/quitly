import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  text: { color: theme.colors.textPrimary, fontSize: theme.typography.body.fontSize, fontWeight: "600" },
});
