import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/Root";
import { getJournalEntryById } from "../journal/journalStorage";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function JournalDetailScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RootStackParamList["JournalDetail"];
  const entry = getJournalEntryById(params.entryId);

  if (!entry) {
    return (
      <Screen>
        <View style={styles.root}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={styles.back}>{t("close")}</Text>
          </Pressable>
          <Text style={styles.empty}>{t("journalEntryNotFound")}</Text>
        </View>
      </Screen>
    );
  }

  const dateLabel = new Intl.DateTimeFormat(i18n.language || "fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(entry.createdAt));

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={styles.back}>{t("close")}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("JournalCreate")} hitSlop={8}>
            <Text style={styles.add}>{t("journalAddNote")}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text style={styles.mood}>{entry.mood ? t(`journalMood.${entry.mood}`) : t("journalMood.none")}</Text>

          <View style={styles.badges}>
            {entry.linkedToShield ? <Text style={styles.badge}>🔥 {t("journalLinkedShield")}</Text> : null}
            {entry.linkedToRelapse ? <Text style={styles.badge}>🔁 {t("journalLinkedRelapse")}</Text> : null}
          </View>

          <Text style={styles.text}>{entry.text}</Text>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  back: { color: theme.colors.textSecondary, fontSize: 14 },
  add: { color: theme.colors.primary, fontSize: 13, fontWeight: "700" },
  scroll: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  date: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 },
  mood: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: "800", marginBottom: 10 },
  badges: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: {
    color: theme.colors.textSecondary,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  text: { color: theme.colors.textPrimary, fontSize: 16, lineHeight: 24 },
  empty: { color: theme.colors.textSecondary, marginTop: 12 },
});
