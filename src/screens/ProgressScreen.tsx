import React, { useCallback, useMemo, useState } from "react";
import { Text, View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import LineChart from "../components/LineChart";
import PaywallModal from "../components/PaywallModal";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getBool, getNumber, getString, setBool } from "../storage/mmkv";
import { cigarettesAvoided, daysSince, moneySaved, moneySavedFromCigarettes } from "../utils/calculations";
import { formatCurrencyEUR } from "../utils/format";
import { todayLocalISODate } from "../utils/date";
import { DailyCheckin, lastRelapseDate, readDailyCheckins, smokedSinceUntil, totalSmokedSince } from "../storage/checkins";

type ProgressProfile = {
  isPremium: boolean;
  quitDate: string;
  cigsPerDay: number;
  pricePerPack: number;
  cigsPerPack: number;
};

function readProfile(): ProgressProfile {
  return {
    isPremium: getBool(StorageKeys.isPremium) ?? false,
    quitDate: getString(StorageKeys.quitDate) ?? todayLocalISODate(),
    cigsPerDay: getNumber(StorageKeys.cigsPerDay) ?? 12,
    pricePerPack: getNumber(StorageKeys.pricePerPack) ?? 12,
    cigsPerPack: getNumber(StorageKeys.cigsPerPack) ?? 20,
  };
}

function formatDateForLocale(dateISO: string, locale: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function addDaysISO(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProgressScreen() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProgressProfile>(() => readProfile());
  const [checkins, setCheckins] = useState<DailyCheckin[]>(() => readDailyCheckins());
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { isPremium, quitDate, cigsPerDay, pricePerPack, cigsPerPack } = profile;

  useFocusEffect(
    useCallback(() => {
      setProfile(readProfile());
      setCheckins(readDailyCheckins());
    }, [])
  );

  const days = daysSince(quitDate);
  const smokedTotal = totalSmokedSince(checkins, quitDate);
  const plannedAvoided = cigarettesAvoided(days, cigsPerDay);
  const totalAvoided = Math.max(0, plannedAvoided - smokedTotal);
  const totalSaved = moneySavedFromCigarettes(totalAvoided, cigsPerPack, pricePerPack);

  const sampledDays = useMemo(() => {
    if (days <= 0) return [0, 0];
    const points = Math.min(days + 1, 120);
    const samples: number[] = [];
    for (let i = 0; i < points; i += 1) {
      const d = Math.round((i * days) / (points - 1));
      samples.push(d);
    }
    return samples;
  }, [days]);

  const savedSeries = useMemo(() => {
    return sampledDays.map((d) => {
      const sampleDate = addDaysISO(quitDate, d);
      const smokedUntil = smokedSinceUntil(checkins, quitDate, sampleDate);
      const avoided = Math.max(0, cigarettesAvoided(d, cigsPerDay) - smokedUntil);
      return moneySavedFromCigarettes(avoided, cigsPerPack, pricePerPack);
    });
  }, [sampledDays, quitDate, checkins, cigsPerDay, cigsPerPack, pricePerPack]);

  const cigarettesSeries = useMemo(() => {
    return sampledDays.map((d) => {
      const sampleDate = addDaysISO(quitDate, d);
      const smokedUntil = smokedSinceUntil(checkins, quitDate, sampleDate);
      return Math.max(0, cigarettesAvoided(d, cigsPerDay) - smokedUntil);
    });
  }, [sampledDays, quitDate, checkins, cigsPerDay]);

  const minSaved = Math.min(...savedSeries);
  const maxSaved = Math.max(...savedSeries);
  const maxCigarettes = Math.max(...cigarettesSeries);
  const quitDateLabel = formatDateForLocale(quitDate, i18n.language || "fr-FR");

  const projections = [
    { daysAhead: 30, value: moneySaved(days + 30, cigsPerDay, cigsPerPack, pricePerPack) },
    { daysAhead: 90, value: moneySaved(days + 90, cigsPerDay, cigsPerPack, pricePerPack) },
    { daysAhead: 365, value: moneySaved(days + 365, cigsPerDay, cigsPerPack, pricePerPack) },
  ];
  const maxProjection = Math.max(...projections.map((p) => p.value), 1);
  const savedLabel = formatCurrencyEUR(totalSaved);

  const relapseDate = lastRelapseDate(checkins, quitDate);
  const streakAnchor = relapseDate ?? quitDate;
  const streakDays = daysSince(streakAnchor);
  const badgeMilestones = [3, 7, 14, 30, 90];

  const todayISO = todayLocalISODate();
  const weekStartISO = addDaysISO(todayISO, -6);
  const monthStartISO = addDaysISO(todayISO, -29);
  const weekRelapseEntries = checkins.filter((entry) => entry.date >= weekStartISO && entry.date <= todayISO && entry.smoked > 0);
  const monthRelapseEntries = checkins.filter((entry) => entry.date >= monthStartISO && entry.date <= todayISO && entry.smoked > 0);
  const weekRelapseCigs = weekRelapseEntries.reduce((sum, entry) => sum + entry.smoked, 0);
  const monthRelapseCigs = monthRelapseEntries.reduce((sum, entry) => sum + entry.smoked, 0);

  const weekHistory = useMemo(() => {
    const segments = [3, 2, 1, 0].map((offset) => {
      const start = addDaysISO(todayISO, -(offset * 7 + 6));
      const end = addDaysISO(todayISO, -(offset * 7));
      const smoked = smokedSinceUntil(checkins, start, end);
      return { key: `${start}-${end}`, label: t("relapseHistoryWeekShort", { index: 4 - offset }), smoked };
    });
    const max = Math.max(...segments.map((segment) => segment.smoked), 1);
    return { segments, max };
  }, [checkins, todayISO, t]);

  const unlockPremium = () => {
    setBool(StorageKeys.isPremium, true);
    setProfile((p) => ({ ...p, isPremium: true }));
    setPaywallOpen(false);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>{t("appName")}</Text>
          <Pressable style={styles.pill} onPress={() => setPaywallOpen(true)}>
            <Text style={[styles.pillText, isPremium && { color: theme.colors.primary }]}>
              {isPremium ? `${t("premium")} ✓` : t("premium")}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{t("progress")}</Text>

        <View style={styles.chartBox}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{t("chartTitleSavings")}</Text>
            <Text style={styles.chartValue}>{formatCurrencyEUR(totalSaved)}</Text>
          </View>
          {isPremium ? <LineChart width={320} height={180} data={savedSeries} /> : <Text style={styles.locked}>{t("chartsPremium")}</Text>}
          {isPremium ? (
            <View style={styles.legendWrap}>
              <View style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>{t("chartLegendSinceDate", { date: quitDateLabel })}</Text>
                </View>
              </View>
              <View style={styles.legendRow}>
                <Text style={styles.legendSubText}>{t("chartLegendMin", { value: formatCurrencyEUR(minSaved) })}</Text>
                <Text style={styles.legendSubText}>{t("chartLegendMax", { value: formatCurrencyEUR(maxSaved) })}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.chartBox}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{t("chartTitleCigarettes")}</Text>
            <Text style={styles.chartValue}>{totalAvoided.toLocaleString(i18n.language || "fr-FR")}</Text>
          </View>
          {isPremium ? <LineChart width={320} height={180} data={cigarettesSeries} /> : <Text style={styles.locked}>{t("chartsPremium")}</Text>}
          {isPremium ? (
            <View style={styles.legendWrap}>
              <View style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={styles.legendText}>{t("chartLegendSinceDate", { date: quitDateLabel })}</Text>
                </View>
              </View>
              <View style={styles.legendRow}>
                <Text style={styles.legendSubText}>{t("chartLegendMaxCigarettes", { value: maxCigarettes.toLocaleString(i18n.language || "fr-FR") })}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.chartBox}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{t("projectionSavingsTitle")}</Text>
            <Text style={styles.chartValue}>{t("projectionSavingsSubtitle")}</Text>
          </View>
          {isPremium ? (
            <View>
              {projections.map((projection) => {
                const pct = Math.max(6, Math.round((projection.value / maxProjection) * 100));
                return (
                  <View key={projection.daysAhead} style={styles.projectionRow}>
                    <Text style={styles.projectionLabel}>{t("projectionInDays", { days: projection.daysAhead })}</Text>
                    <Text style={styles.projectionValue}>{formatCurrencyEUR(projection.value)}</Text>
                    <View style={styles.projectionTrack}>
                      <View style={[styles.projectionFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.locked}>{t("chartsPremium")}</Text>
          )}
        </View>

        <View style={styles.chartBox}>
          <Text style={styles.chartTitle}>{t("relapseBadgesTitle")}</Text>
          <Text style={styles.legendSubText}>{t("relapseBadgesSubtitle", { days: streakDays })}</Text>
          <Text style={styles.legendSubText}>{t("relapseBadgesAnchorDate", { date: formatDateForLocale(streakAnchor, i18n.language || "fr-FR") })}</Text>
          {isPremium ? (
            <View style={styles.badgesWrap}>
              {badgeMilestones.map((milestone) => {
                const unlocked = streakDays >= milestone;
                return (
                  <View key={milestone} style={[styles.badge, unlocked ? styles.badgeOn : styles.badgeOff]}>
                    <Text style={styles.badgeIcon}>{unlocked ? "OK" : "LOCK"}</Text>
                    <Text style={styles.badgeText}>{t("relapseBadgeDays", { days: milestone })}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.locked}>{t("premiumRelapseInsightsTeaser")}</Text>
          )}
        </View>

        <View style={styles.chartBox}>
          <Text style={styles.chartTitle}>{t("relapseHistoryTitle")}</Text>
          {isPremium ? (
            <View style={styles.historyWrap}>
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>{t("relapseHistoryThisWeek")}</Text>
                <Text style={styles.historyValue}>{t("relapseHistoryCigsAndDays", { cigs: weekRelapseCigs, days: weekRelapseEntries.length })}</Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>{t("relapseHistoryLast30Days")}</Text>
                <Text style={styles.historyValue}>{t("relapseHistoryCigsAndDays", { cigs: monthRelapseCigs, days: monthRelapseEntries.length })}</Text>
              </View>
              <View style={{ marginTop: 10 }}>
                {weekHistory.segments.map((segment) => {
                  const pct = Math.max(8, Math.round((segment.smoked / weekHistory.max) * 100));
                  return (
                    <View key={segment.key} style={styles.projectionRow}>
                      <Text style={styles.projectionLabel}>{segment.label}</Text>
                      <Text style={styles.projectionValue}>{t("relapseHistorySmokedValue", { value: segment.smoked })}</Text>
                      <View style={styles.projectionTrack}>
                        <View style={[styles.historyFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={styles.locked}>{t("premiumRelapseInsightsTeaser")}</Text>
          )}
        </View>

        <View style={styles.timeline}>
          <Text style={styles.item}>{t("timeline24h")}</Text>
          <Text style={styles.item}>{t("timeline1week")}</Text>
          <Text style={[styles.item, !isPremium && styles.lockedText]}>{isPremium ? t("timeline1month") : t("timeline1monthPremium")}</Text>
        </View>
      </ScrollView>
      <PaywallModal visible={paywallOpen} onClose={() => setPaywallOpen(false)} onUnlock={unlockPremium} savedAmountLabel={savedLabel} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  title: { color: theme.colors.textPrimary, fontSize: theme.typography.h2.fontSize, fontWeight: "800" },
  chartBox: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  chartHeader: { marginBottom: 10 },
  chartTitle: { color: theme.colors.textSecondary, fontWeight: "700" },
  chartValue: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "800", marginTop: 4 },
  locked: { color: theme.colors.textSecondary, textAlign: "center", paddingVertical: 20 },
  legendWrap: { marginTop: 10 },
  legendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  legendLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  legendText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "700" },
  legendSubText: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 4 },
  projectionRow: { marginBottom: 14 },
  projectionLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 },
  projectionValue: { color: theme.colors.textPrimary, fontWeight: "700", marginBottom: 6 },
  projectionTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.divider,
    overflow: "hidden",
  },
  projectionFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeOn: { backgroundColor: theme.colors.primary },
  badgeOff: { backgroundColor: theme.colors.divider },
  badgeIcon: { fontSize: 12, fontWeight: "800", color: theme.colors.textPrimary },
  badgeText: { color: theme.colors.textPrimary, fontWeight: "700", fontSize: 12 },
  historyWrap: { marginTop: 10 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  historyLabel: { color: theme.colors.textSecondary },
  historyValue: { color: theme.colors.textPrimary, fontWeight: "700" },
  historyFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#f59e0b",
  },
  timeline: { marginTop: theme.spacing.md },
  item: { color: theme.colors.textPrimary, marginBottom: 12 },
  lockedText: { color: theme.colors.textTertiary },
});
