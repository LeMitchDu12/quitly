import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import type { JournalEntry } from "../../journal/journalTypes";

type Props = {
  entry: JournalEntry;
  dateLabel: string;
  moodLabel: string;
  onPress: () => void;
};

export default function JournalCard({ entry, dateLabel, moodLabel, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.topRow}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.mood}>{moodLabel}</Text>
      </View>
      <Text numberOfLines={2} style={styles.text}>
        {entry.text}
      </Text>
      <View style={styles.linkedRow}>
        {entry.linkedToShield ? <Text style={styles.linkedTag}>🔥</Text> : null}
        {entry.linkedToRelapse ? <Text style={styles.linkedTag}>🔁</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    padding: 14,
    marginBottom: 10,
  },
  pressed: { opacity: 0.9 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  date: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  mood: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  text: {
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
  linkedRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  linkedTag: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
});
