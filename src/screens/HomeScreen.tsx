import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../components/Screen";
import StatCard from "../components/StatCard";
import SecondaryButton from "../components/SecondaryButton";
import PaywallModal from "../components/PaywallModal";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getBool, getNumber, getString, setBool, setString } from "../storage/mmkv";
import { daysSince, cigarettesAvoided, moneySavedFromCigarettes, timeGainedHours } from "../utils/calculations";
import { formatCurrencyEUR } from "../utils/format";
import { todayLocalISODate } from "../utils/date";
import { DailyCheckin, readDailyCheckins, totalSmokedSince, upsertDailyCheckin } from "../storage/checkins";

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
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [dailyRelapseMode, setDailyRelapseMode] = useState(false);
  const [dailyCigs, setDailyCigs] = useState(1);

  const loadData = () => {
    const quitDate = getString(StorageKeys.quitDate) ?? todayLocalISODate();
    const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
    const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
    const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;
    const isPremium = getBool(StorageKeys.isPremium) ?? false;
    setProfile({ quitDate, cigsPerDay, pricePerPack, cigsPerPack, isPremium });
    setCheckins(readDailyCheckins());
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const stats = useMemo(() => {
    if (!profile) return null;
    const days = daysSince(profile.quitDate);
    const plannedAvoided = cigarettesAvoided(days, profile.cigsPerDay);
    const smokedTotal = totalSmokedSince(checkins, profile.quitDate);
    const avoided = Math.max(0, plannedAvoided - smokedTotal);
    const saved = moneySavedFromCigarettes(avoided, profile.cigsPerPack, profile.pricePerPack);
    const gainedHours = timeGainedHours(avoided);
    return { days, avoided, saved, gainedHours };
  }, [checkins, profile]);

  const today = todayLocalISODate();
  const todayCheckin = useMemo(() => checkins.find((entry) => entry.date === today), [checkins, today]);

  const saveTodayCheckin = (smoked: number) => {
    upsertDailyCheckin(today, smoked);
    setCheckins(readDailyCheckins());
    setDailyRelapseMode(false);
    setDailyCigs(1);
  };

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
    setBool(StorageKeys.isPremium, true);
    setProfile((p) => (p ? { ...p, isPremium: true } : p));
    setPaywallOpen(false);
  };

  const resetToToday = () => {
    const date = todayLocalISODate();
    setString(StorageKeys.quitDate, date);
    setProfile((p) => (p ? { ...p, quitDate: date } : p));
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.brand}>{t("appName")}</Text>

        <Pressable style={styles.pill} onPress={() => setPaywallOpen(true)}>
          <Text style={[styles.pillText, profile.isPremium && { color: theme.colors.primary }]}>
            {profile.isPremium ? `${t("premium")} ✓` : t("premium")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroNumber}>{stats.days}</Text>
        <Text style={styles.heroLabel}>{t("daysSmokeFree")}</Text>
        <View style={styles.heroDivider} />
        <Text style={styles.heroSub}>{stats.days === 0 ? t("homeDayZero") : t("homeKeepGoing")}</Text>
      </View>

      <StatCard icon="💸" value={savedLabel} label={t("saved")} />
      <StatCard icon="🚭" value={`${stats.avoided}`} label={t("cigarettesAvoided")} />
      <StatCard icon="⏳" value={`${stats.gainedHours}h`} label={t("timeGained")} />

      <View style={{ height: theme.spacing.sm }} />

      {!todayCheckin ? (
        <View style={styles.checkinCard}>
          <Text style={styles.checkinTitle}>{t("dailyCheckinTitle")}</Text>
          <Text style={styles.checkinSubtitle}>{t("dailyCheckinSubtitle")}</Text>

          {!dailyRelapseMode ? (
            <View style={styles.checkinActions}>
              <Pressable style={[styles.checkinButton, styles.successButton]} onPress={() => saveTodayCheckin(0)}>
                <Text style={styles.checkinButtonText}>{t("dailyCheckinNoRelapse")}</Text>
              </Pressable>
              <Pressable style={[styles.checkinButton, styles.relapseButton]} onPress={() => setDailyRelapseMode(true)}>
                <Text style={styles.checkinButtonText}>{t("dailyCheckinYesRelapse")}</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.counterLabel}>{t("dailyCheckinHowMany")}</Text>
              <View style={styles.counterRow}>
                <Pressable style={styles.counterButton} onPress={() => setDailyCigs((v) => Math.max(1, v - 1))}>
                  <Text style={styles.counterButtonText}>-</Text>
                </Pressable>
                <Text style={styles.counterValue}>{dailyCigs}</Text>
                <Pressable style={styles.counterButton} onPress={() => setDailyCigs((v) => v + 1)}>
                  <Text style={styles.counterButtonText}>+</Text>
                </Pressable>
              </View>
              <View style={styles.checkinActions}>
                <Pressable style={[styles.checkinButton, styles.successButton]} onPress={() => saveTodayCheckin(dailyCigs)}>
                  <Text style={styles.checkinButtonText}>{t("settingsSave")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.checkinButton, styles.cancelButton]}
                  onPress={() => {
                    setDailyRelapseMode(false);
                    setDailyCigs(1);
                  }}
                >
                  <Text style={styles.checkinButtonText}>{t("settingsCancel")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.checkinDone}>
          <Text style={styles.checkinDoneText}>
            {todayCheckin.smoked > 0
              ? t("dailyCheckinLoggedWithCount", { count: todayCheckin.smoked })
              : t("dailyCheckinLoggedNoRelapse")}
          </Text>
        </View>
      )}

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

  checkinCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: theme.spacing.sm,
  },
  checkinTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: "800" },
  checkinSubtitle: { color: theme.colors.textSecondary, marginTop: 4, marginBottom: 10 },
  checkinActions: { flexDirection: "row", gap: 8 },
  checkinButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  successButton: { backgroundColor: theme.colors.primary },
  relapseButton: { borderWidth: 1, borderColor: theme.colors.outline },
  cancelButton: { borderWidth: 1, borderColor: theme.colors.outline },
  checkinButtonText: { color: theme.colors.textPrimary, fontWeight: "800" },
  counterLabel: { color: theme.colors.textSecondary, marginBottom: 8 },
  counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 10, gap: 14 },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  counterButtonText: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: "700" },
  counterValue: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: "900", minWidth: 24, textAlign: "center" },
  checkinDone: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 12,
    marginBottom: theme.spacing.sm,
  },
  checkinDoneText: { color: theme.colors.textSecondary, fontWeight: "600" },
});
