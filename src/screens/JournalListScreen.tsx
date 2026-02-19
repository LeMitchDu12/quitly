import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import SecondaryButton from "../components/SecondaryButton";
import PaywallModal from "../components/PaywallModal";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/Root";
import { readJournalEntries } from "../journal/journalStorage";
import type { JournalEntry, JournalMood } from "../journal/journalTypes";
import JournalCard from "../components/journal/JournalCard";
import { getBool, getNumber, getString, setBool } from "../storage/mmkv";
import { StorageKeys } from "../storage/keys";
import { cigarettesAvoided, daysSince, moneySavedFromCigarettes } from "../utils/calculations";
import { totalSmokedSince, readDailyCheckins } from "../storage/checkins";
import { formatCurrencyEUR } from "../utils/format";
import { todayLocalISODate } from "../utils/date";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MOOD_FILTERS: Array<JournalMood | "all"> = ["all", "stable", "stress", "craving", "proud"];

export default function JournalListScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [query, setQuery] = useState("");
  const [filterMood, setFilterMood] = useState<JournalMood | "all">("all");
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setEntries(readJournalEntries());
      setIsPremium(getBool(StorageKeys.isPremium) ?? false);
    }, [])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filterMood !== "all" && entry.mood !== filterMood) return false;
      if (!q) return true;
      return entry.text.toLowerCase().includes(q);
    });
  }, [entries, query, filterMood]);

  const unlockPremium = () => {
    setBool(StorageKeys.isPremium, true);
    setIsPremium(true);
    setPaywallOpen(false);
  };

  const savedAmountLabel = useMemo(() => {
    const quitDate = getString(StorageKeys.quitDate) ?? todayLocalISODate();
    const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
    const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;
    const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
    const days = daysSince(quitDate);
    const smoked = totalSmokedSince(readDailyCheckins(), quitDate);
    const avoided = Math.max(0, cigarettesAvoided(days, cigsPerDay) - smoked);
    return formatCurrencyEUR(moneySavedFromCigarettes(avoided, cigsPerPack, pricePerPack));
  }, []);

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={styles.back}>{t("close")}</Text>
          </Pressable>
          <Text style={styles.title}>{t("journalTitle")}</Text>
          <Pressable onPress={() => setPaywallOpen(true)} hitSlop={8}>
            <Text style={[styles.premium, isPremium && styles.premiumActive]}>
              {isPremium ? `${t("premium")} PRO` : t("premium")}
            </Text>
          </Pressable>
        </View>

        {!isPremium ? (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>{t("journalPremiumTitle")}</Text>
            <Text style={styles.lockedText}>{t("journalPremiumBody")}</Text>
            <View style={{ marginTop: 10 }}>
              <SecondaryButton title={t("shieldPaywallCtaUnlock")} onPress={() => setPaywallOpen(true)} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.actionRow}>
              <SecondaryButton title={t("journalAddNote")} onPress={() => navigation.navigate("JournalCreate")} />
            </View>

            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder={t("journalSearchPlaceholder")}
              placeholderTextColor={theme.colors.textTertiary}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {MOOD_FILTERS.map((moodKey) => {
                const selected = moodKey === filterMood;
                const label = moodKey === "all" ? t("journalFilterAll") : t(`journalMood.${moodKey}`);
                return (
                  <Pressable
                    key={moodKey}
                    style={[styles.filterChip, selected && styles.filterChipActive]}
                    onPress={() => setFilterMood(moodKey)}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {filtered.length === 0 ? (
                <Text style={styles.empty}>{t("journalEmpty")}</Text>
              ) : (
                filtered.map((entry) => {
                  const dateLabel = new Intl.DateTimeFormat(i18n.language || "fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(entry.createdAt));

                  const moodLabel = entry.mood ? t(`journalMood.${entry.mood}`) : t("journalMood.none");

                  return (
                    <JournalCard
                      key={entry.id}
                      entry={entry}
                      dateLabel={dateLabel}
                      moodLabel={moodLabel}
                      onPress={() => navigation.navigate("JournalDetail", { entryId: entry.id })}
                    />
                  );
                })
              )}
            </ScrollView>
          </>
        )}
      </View>

      <PaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlock={unlockPremium}
        savedAmountLabel={savedAmountLabel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  back: { color: theme.colors.textSecondary, fontSize: 14 },
  title: { color: theme.colors.textPrimary, fontWeight: "800", fontSize: 18 },
  premium: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "800" },
  premiumActive: { color: theme.colors.primary },
  lockedCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    padding: 16,
  },
  lockedTitle: { color: theme.colors.textPrimary, fontWeight: "800", fontSize: 18 },
  lockedText: { color: theme.colors.textSecondary, marginTop: 6, lineHeight: 21 },
  actionRow: { marginBottom: theme.spacing.xs },
  search: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  filters: { gap: 8, paddingBottom: 10 },
  filterChip: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(74,222,128,0.10)",
  },
  filterText: { color: theme.colors.textSecondary, fontWeight: "700", fontSize: 12 },
  filterTextActive: { color: theme.colors.primary },
  listContent: { paddingBottom: theme.spacing.md },
  empty: { color: theme.colors.textSecondary, marginTop: 8 },
});
