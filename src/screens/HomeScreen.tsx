import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, Platform } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import SecondaryButton from "../components/SecondaryButton";
import PaywallModal from "../components/PaywallModal";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getBool, getNumber, getString, setBool, setString } from "../storage/mmkv";
import { daysSince, cigarettesAvoided, moneySavedFromCigarettes, timeGainedHours } from "../utils/calculations";
import { formatMoney } from "../localization/money";
import { todayLocalISODate } from "../utils/date";
import { DailyCheckin, lastRelapseDate, readDailyCheckins, totalSmokedSince, upsertDailyCheckin } from "../storage/checkins";
import type { RootStackParamList } from "../navigation/Root";

function formatDate(dateISO: string, locale: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function parseISODate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function addDaysISO(dateISO: string, delta: number) {
  const d = parseISODate(dateISO);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampISODateToToday(dateISO: string) {
  const candidate = parseISODate(dateISO);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const normalized = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
  if (normalized > today) return todayLocalISODate();
  const y = normalized.getFullYear();
  const m = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Profile = {
  quitDate: string;
  cigsPerDay: number;
  pricePerPack: number;
  cigsPerPack: number;
  isPremium: boolean;
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [dailyRelapseMode, setDailyRelapseMode] = useState(false);
  const [dailyCigs, setDailyCigs] = useState(1);
  const [selectedRelapseDate, setSelectedRelapseDate] = useState(todayLocalISODate());
  const [showRelapseDatePicker, setShowRelapseDatePicker] = useState(false);

  const loadData = () => {
    const quitDate = getString(StorageKeys.quitDate) ?? todayLocalISODate();
    const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
    const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
    const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;
    const isPremium = getBool(StorageKeys.isPremium) ?? false;
    setProfile({ quitDate, cigsPerDay, pricePerPack, cigsPerPack, isPremium });

    const freshCheckins = readDailyCheckins();
    setCheckins(freshCheckins);

    const pendingAction = getString(StorageKeys.pendingAction);
    if (pendingAction === "dailyCheckin") {
      const hasToday = freshCheckins.some((entry) => entry.date === todayLocalISODate());
      if (!hasToday) setDailyRelapseMode(false);
      setString(StorageKeys.pendingAction, "");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const lastRelapse = useMemo(
    () => lastRelapseDate(checkins, profile?.quitDate ?? todayLocalISODate()),
    [checkins, profile]
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

  const saveCheckin = (dateISO: string, smoked: number) => {
    upsertDailyCheckin(clampISODateToToday(dateISO), smoked);
    setCheckins(readDailyCheckins());
    setDailyRelapseMode(false);
    setDailyCigs(1);
    setSelectedRelapseDate(todayLocalISODate());
    setShowRelapseDatePicker(false);
    if (smoked > 0) {
      navigation.navigate("RelapseSupport", { savedAmountLabel: savedLabel });
    }
  };

  const editTodayCheckin = () => {
    const initial = todayCheckin?.smoked ?? 0;
    setDailyCigs(initial);
    setSelectedRelapseDate(today);
    setDailyRelapseMode(true);
  };

  const onRelapseDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowRelapseDatePicker(false);
    if (!selected) return;
    const y = selected.getFullYear();
    const m = String(selected.getMonth() + 1).padStart(2, "0");
    const day = String(selected.getDate()).padStart(2, "0");
    setSelectedRelapseDate(clampISODateToToday(`${y}-${m}-${day}`));
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

  const savedLabel = formatMoney(stats.saved);
  const locale = i18n.language || "fr-FR";
  const avoidedLabel = stats.avoided.toLocaleString(locale);
  const gainedHoursLabel = `${stats.gainedHours.toLocaleString(locale)}h`;
  const showDailyCheckin = stats.days > 0 || !!todayCheckin || dailyRelapseMode;

  const unlockPremium = () => {
    setBool(StorageKeys.isPremium, true);
    setProfile((p) => (p ? { ...p, isPremium: true } : p));
    setPaywallOpen(false);
  };

  const renderCheckinCard = () => {
    if (dailyRelapseMode) {
      const yesterday = addDaysISO(today, -1);
      const relapseDateLabel = formatDate(selectedRelapseDate, i18n.language || "fr-FR");
      const isTodaySelected = selectedRelapseDate === today;
      const isYesterdaySelected = selectedRelapseDate === yesterday;

      return (
        <View style={styles.checkinCard}>
          <Text style={styles.checkinTitle}>{t("dailyCheckinTitle")}</Text>
          <Text style={styles.checkinSubtitle}>{t("dailyCheckinSubtitle")}</Text>
          <Text style={styles.counterLabel}>{t("dailyCheckinDateLabel")}</Text>
          <View style={styles.quickRow}>
            <Pressable
              style={[styles.quickChip, isTodaySelected && styles.quickChipActive]}
              onPress={() => setSelectedRelapseDate(today)}
            >
              <Text style={[styles.quickText, isTodaySelected && styles.quickTextActive]}>{t("onboardingToday")}</Text>
            </Pressable>
            <Pressable
              style={[styles.quickChip, isYesterdaySelected && styles.quickChipActive]}
              onPress={() => setSelectedRelapseDate(yesterday)}
            >
              <Text style={[styles.quickText, isYesterdaySelected && styles.quickTextActive]}>{t("onboardingYesterday")}</Text>
            </Pressable>
            {Platform.OS === "android" ? (
              <Pressable style={styles.quickChip} onPress={() => setShowRelapseDatePicker(true)}>
                <Text style={styles.quickText}>{t("onboardingPickDate")}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.dateCard}>
            <Text style={styles.dateLabel}>{t("settingsSelectedDate")}</Text>
            <Text style={styles.dateValue}>{relapseDateLabel}</Text>
          </View>
          {(showRelapseDatePicker || Platform.OS === "ios") && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={parseISODate(selectedRelapseDate)}
                mode="date"
                maximumDate={new Date()}
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onRelapseDateChange}
                themeVariant="dark"
                style={styles.datePicker}
              />
            </View>
          )}
          <Text style={styles.counterLabel}>{t("dailyCheckinHowMany")}</Text>
          <View style={styles.counterRow}>
            <Pressable style={styles.counterButton} onPress={() => setDailyCigs((v) => Math.max(0, v - 1))}>
              <Text style={styles.counterButtonText}>-</Text>
            </Pressable>
            <Text style={styles.counterValue}>{dailyCigs}</Text>
            <Pressable style={styles.counterButton} onPress={() => setDailyCigs((v) => v + 1)}>
              <Text style={styles.counterButtonText}>+</Text>
            </Pressable>
          </View>
          <View style={styles.checkinActions}>
            <Pressable style={[styles.checkinButton, styles.successButton]} onPress={() => saveCheckin(selectedRelapseDate, dailyCigs)}>
              <Text style={styles.checkinButtonText}>{t("settingsSave")}</Text>
            </Pressable>
            <Pressable
              style={[styles.checkinButton, styles.cancelButton]}
              onPress={() => {
                setDailyRelapseMode(false);
                setDailyCigs(1);
                setSelectedRelapseDate(today);
                setShowRelapseDatePicker(false);
              }}
            >
              <Text style={styles.checkinButtonText}>{t("settingsCancel")}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (todayCheckin) {
      return (
        <View style={styles.checkinDone}>
          <Text style={styles.checkinDoneText}>
            {todayCheckin.smoked > 0
              ? t("dailyCheckinLoggedWithCount", { count: todayCheckin.smoked })
              : t("dailyCheckinLoggedNoRelapse")}
          </Text>
          <View style={{ marginTop: theme.spacing.sm }}>
            <SecondaryButton title={t("dailyCheckinEdit")} onPress={editTodayCheckin} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.checkinCard}>
        <Text style={styles.checkinTitle}>{t("dailyCheckinTitle")}</Text>
        <Text style={styles.checkinSubtitle}>{t("dailyCheckinSubtitle")}</Text>
        <View style={styles.checkinActions}>
          <Pressable style={[styles.checkinButton, styles.successButton]} onPress={() => saveCheckin(today, 0)}>
            <Text style={styles.checkinButtonText}>{t("dailyCheckinNoRelapse")}</Text>
          </Pressable>
          <Pressable
            style={[styles.checkinButton, styles.relapseButton]}
            onPress={() => {
              setDailyRelapseMode(true);
              setDailyCigs(1);
              setSelectedRelapseDate(today);
              setShowRelapseDatePicker(false);
            }}
          >
            <Text style={styles.checkinButtonText}>{t("dailyCheckinYesRelapse")}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>{t("appName")}</Text>
          <Pressable style={styles.pill} onPress={() => setPaywallOpen(true)}>
            <Text style={[styles.pillText, profile.isPremium && { color: theme.colors.primary }]}>
              {profile.isPremium ? `${t("premium")} PRO` : t("premium")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />
          <Text style={styles.heroNumber}>{stats.days}</Text>
          <Text style={styles.heroLabel}>{t("daysSmokeFree")}</Text>
          <View style={styles.heroDivider} />
          <Text style={styles.heroSub}>
            {stats.days === 0
              ? t("homeDayZero")
              : lastRelapse
              ? t("homeRelapseSubtitle", { date: formatDate(lastRelapse, i18n.language || "fr-FR") })
              : t("homeKeepGoing")}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t("quitDate")}</Text>
            <Text style={styles.metaValue}>{formatDate(profile.quitDate, i18n.language || "fr-FR")}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t("premium")}</Text>
            <Text style={styles.metaValue}>{profile.isPremium ? t("settingsEnabled") : t("premiumInactive")}</Text>
          </View>
        </View>

        <Pressable style={styles.urgeButton} onPress={() => navigation.navigate("QuitlyShield")}>
          <Text style={styles.urgeButtonText}>{t("shieldQuickCta")}</Text>
          <Text style={styles.urgeButtonHint}>{t("shieldQuickHint")}</Text>
        </Pressable>

        {showDailyCheckin ? renderCheckinCard() : null}
        <View style={styles.progressWrap}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.statsTitle}>{t("progress")}</Text>
            <Pressable style={styles.progressLinkButton} onPress={() => navigation.navigate("Progress")}>
              <Text style={styles.progressLink}>{">"}</Text>
            </Pressable>
          </View>

          <Pressable style={styles.primaryMetricCard} onPress={() => navigation.navigate("Progress")}>
            <View style={styles.primaryMetricGlow} />
            <Text style={styles.primaryMetricKicker}>{t("moneySaved")}</Text>
            <Text style={styles.primaryMetricValue}>{savedLabel}</Text>
            <Text style={styles.primaryMetricHint}>{t("chartLegendSinceQuit", { days: stats.days })}</Text>
          </Pressable>

          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricIcon}>{"\uD83D\uDEAD"}</Text>
              <Text style={styles.metricValue}>{avoidedLabel}</Text>
              <Text style={styles.metricLabel}>{t("cigarettesAvoided")}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricIcon}>{"\u23F1\uFE0F"}</Text>
              <Text style={styles.metricValue}>{gainedHoursLabel}</Text>
              <Text style={styles.metricLabel}>{t("timeGained")}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

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
  content: { paddingBottom: theme.spacing.xl },
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
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  heroGlowA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.16)",
    top: -70,
    left: -50,
  },
  heroGlowB: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.10)",
    bottom: -50,
    right: -40,
  },
  heroNumber: { color: theme.colors.textPrimary, fontSize: 64, fontWeight: "900" },
  heroLabel: { color: theme.colors.textSecondary, marginTop: 6, fontSize: 16, fontWeight: "600" },
  heroDivider: { height: 1, backgroundColor: theme.colors.divider, width: "100%", marginVertical: 16 },
  heroSub: { color: theme.colors.textTertiary, textAlign: "center" },
  metaRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  metaCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metaLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  metaValue: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    marginTop: 4,
    fontSize: 14,
  },
  statsTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
  },
  progressWrap: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
  progressLinkButton: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.elevated,
  },
  progressLink: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 14,
    fontWeight: "700",
  },
  primaryMetricCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.32)",
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: theme.spacing.xs,
  },
  primaryMetricGlow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.14)",
    right: -32,
    top: -42,
  },
  primaryMetricKicker: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  primaryMetricValue: {
    color: theme.colors.textPrimary,
    marginTop: 6,
    fontSize: 32,
    fontWeight: "900",
  },
  primaryMetricHint: {
    color: theme.colors.textTertiary,
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  metricGrid: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  metricIcon: {
    color: theme.colors.primary,
    fontSize: 16,
  },
  metricValue: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  urgeButton: {
    width: "100%",
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.45)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(74,222,128,0.12)",
    shadowColor: "#4ADE80",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  urgeButtonText: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 15,
  },
  urgeButtonHint: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    fontSize: 12,
  },
  checkinCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outline,
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
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  quickChip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: "transparent",
  },
  quickChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.elevated,
  },
  quickText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  quickTextActive: {
    color: theme.colors.primary,
  },
  dateCard: {
    marginBottom: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateLabel: { color: theme.colors.textSecondary, fontSize: 12 },
  dateValue: { color: theme.colors.textPrimary, fontWeight: "800", marginTop: 4 },
  pickerWrap: {
    marginBottom: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.elevated,
    padding: 8,
    overflow: "hidden",
    alignItems: "stretch",
  },
  datePicker: { width: "100%", maxWidth: "100%" },
  checkinDone: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 12,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  checkinDoneText: { color: theme.colors.textSecondary, fontWeight: "600" },
});
