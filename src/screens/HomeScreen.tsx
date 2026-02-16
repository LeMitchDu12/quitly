import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import Screen from "../components/Screen";
import StatCard from "../components/StatCard";
import SecondaryButton from "../components/SecondaryButton";
import PaywallModal from "../components/PaywallModal";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getBool, getNumber, getString, setBool, setString } from "../storage/mmkv";
import { daysSince, cigarettesAvoided, moneySaved, timeGainedHours } from "../utils/calculations";
import { formatCurrencyEUR } from "../utils/format";

type Profile = {
  quitDate: string;
  cigsPerDay: number;
  pricePerPack: number;
  cigsPerPack: number;
  isPremium: boolean;
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    // MMKV sync => pas besoin d'await
    const quitDate = getString(StorageKeys.quitDate) ?? new Date().toISOString().slice(0, 10);
    const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
    const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
    const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;
    const isPremium = getBool(StorageKeys.isPremium) ?? false;

    setProfile({ quitDate, cigsPerDay, pricePerPack, cigsPerPack, isPremium });
  }, []);

  const stats = useMemo(() => {
    if (!profile) return null;
    const days = daysSince(profile.quitDate);
    const avoided = cigarettesAvoided(days, profile.cigsPerDay);
    const saved = moneySaved(days, profile.cigsPerDay, profile.cigsPerPack, profile.pricePerPack);
    const gainedHours = timeGainedHours(avoided);
    return { days, avoided, saved, gainedHours };
  }, [profile]);

  if (!profile || !stats) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  const savedLabel = formatCurrencyEUR(stats.saved);

  const unlockPremium = () => {
    // MVP local. RevenueCat remplacera ça.
    setBool(StorageKeys.isPremium, true);
    setProfile((p) => (p ? { ...p, isPremium: true } : p));
    setPaywallOpen(false);
  };

  const resetToToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setString(StorageKeys.quitDate, today);
    setProfile((p) => (p ? { ...p, quitDate: today } : p));
  };

  return (
    <Screen>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.brand}>{t("appName")}</Text>

        <Pressable style={styles.pill} onPress={() => setPaywallOpen(true)}>
          <Text style={[styles.pillText, profile.isPremium && { color: theme.colors.primary }]}>
            {profile.isPremium ? "Premium ✓" : "Premium"}
          </Text>
        </Pressable>
      </View>

      {/* Hero counter */}
      <View style={styles.hero}>
        <Text style={styles.heroNumber}>{stats.days}</Text>
        <Text style={styles.heroLabel}>{t("daysSmokeFree")}</Text>
        <View style={styles.heroDivider} />
        <Text style={styles.heroSub}>
          {stats.days === 0 ? "Today is day zero." : "Keep going. One day at a time."}
        </Text>
      </View>

      {/* Stats */}
      <StatCard icon="💸" value={savedLabel} label={t("saved")} />
      <StatCard icon="🚭" value={`${stats.avoided}`} label={t("cigarettesAvoided")} />
      <StatCard icon="⏳" value={`${stats.gainedHours}h`} label={t("timeGained")} />

      <View style={{ height: theme.spacing.sm }} />

      <SecondaryButton title={t("iSlipped")} onPress={resetToToday} />

      <PaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlock={unlockPremium}
        savedAmountLabel={savedLabel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  brand: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: "transparent",
  },
  pillText: {
    color: theme.colors.textSecondary,
    fontWeight: "800",
    fontSize: 13,
  },

  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  heroNumber: { color: theme.colors.textPrimary, fontSize: 64, fontWeight: "900" },
  heroLabel: { color: theme.colors.textSecondary, marginTop: 6, fontSize: 16, fontWeight: "600" },
  heroDivider: { height: 1, backgroundColor: theme.colors.divider, width: "100%", marginVertical: 16 },
  heroSub: { color: theme.colors.textTertiary, textAlign: "center" },
});
