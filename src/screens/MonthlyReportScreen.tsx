import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import ReportCard from "../components/reports/ReportCard";
import LockedReportCard from "../components/reports/LockedReportCard";
import MonthPickerPill from "../components/reports/MonthPickerPill";
import PaywallModal from "../components/PaywallModal";
import { readShieldSessions } from "../shield/shieldStorage";
import { readDailyCheckins } from "../storage/checkins";
import { StorageKeys } from "../storage/keys";
import { getBool, getNumber, getString, setBool } from "../storage/mmkv";
import { formatMoney } from "../localization/money";
import { generateMonthlyReport } from "../reports/reportGenerator";
import {
  readDailyStatusMap,
  readMonthlyReportsMap,
  saveMonthlyReportSnapshot,
  syncDailyStatusFromCheckins,
} from "../reports/reportStorage";
import { getMonthLabel, getPreviousMonthKey, listLastMonthKeys } from "../reports/reportSelectors";
import type { MonthlyReport } from "../reports/reportTypes";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/Root";

type ReportProfile = {
  isPremium: boolean;
  quitDate: string;
  cigsPerDay: number;
  pricePerPack: number;
  cigsPerPack: number;
};

function readProfile(): ReportProfile {
  return {
    isPremium: getBool(StorageKeys.isPremium) ?? false,
    quitDate: getString(StorageKeys.quitDate) ?? "",
    cigsPerDay: getNumber(StorageKeys.cigsPerDay) ?? 12,
    pricePerPack: getNumber(StorageKeys.pricePerPack) ?? 12,
    cigsPerPack: getNumber(StorageKeys.cigsPerPack) ?? 20,
  };
}

function toMonthKeyFromISODate(isoDate: string) {
  if (!isoDate || isoDate.length < 7) return null;
  const monthKey = isoDate.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : null;
}

function listMonthKeysSinceQuit(quitDate: string, maxCount = 12) {
  const recent = listLastMonthKeys(maxCount);
  const quitMonthKey = toMonthKeyFromISODate(quitDate);
  if (!quitMonthKey) return recent;
  const filtered = recent.filter((monthKey) => monthKey >= quitMonthKey);
  return filtered.length > 0 ? filtered : [recent[0]];
}

function formatDelta(value: number | undefined, suffix = "") {
  if (value == null) return "--";
  if (value === 0) return `0${suffix}`;
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

export default function MonthlyReportScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<ReportProfile>(() => readProfile());
  const monthKeys = useMemo(() => listMonthKeysSinceQuit(profile.quitDate, 12), [profile.quitDate]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(monthKeys[0]);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [reportsMap, setReportsMap] = useState<Record<string, MonthlyReport>>({});
  const [loading, setLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (monthKeys.length === 0) return;
    if (!monthKeys.includes(selectedMonthKey)) {
      setSelectedMonthKey(monthKeys[0]);
    }
  }, [monthKeys, selectedMonthKey]);

  const loadReport = useCallback((monthKey: string) => {
    setLoading(true);
    try {
      const nextProfile = readProfile();
      setProfile(nextProfile);

      const checkins = readDailyCheckins();
      syncDailyStatusFromCheckins(checkins);
      const dailyStatusMap = readDailyStatusMap();
      const shieldSessions = readShieldSessions();
      const map = readMonthlyReportsMap();
      const prevKey = getPreviousMonthKey(monthKey);
      const previousReport = map[prevKey];

      const generated = generateMonthlyReport({
        monthKey,
        dailyStatusMap,
        shieldSessions,
        profile: nextProfile,
        previousReport,
      });
      const nextMap = saveMonthlyReportSnapshot(generated);
      setReportsMap(nextMap);
      setReport(generated);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReport(selectedMonthKey);
    }, [loadReport, selectedMonthKey])
  );

  const switchMonth = (nextMonthKey: string) => {
    if (nextMonthKey === selectedMonthKey) return;
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setSelectedMonthKey(nextMonthKey);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const selectedIndex = monthKeys.indexOf(selectedMonthKey);
  const canGoPrev = selectedIndex < monthKeys.length - 1;
  const canGoNext = selectedIndex > 0;
  const monthLabel = getMonthLabel(selectedMonthKey, i18n.language || "fr");

  const unlockPremium = () => {
    setBool(StorageKeys.isPremium, true);
    setProfile((prev) => ({ ...prev, isPremium: true }));
    setPaywallOpen(false);
  };

  const historyRows = monthKeys
    .map((monthKey) => reportsMap[monthKey])
    .filter((item): item is MonthlyReport => item != null);

  const noTracking = report != null && report.totals.daysTracked === 0;
  const cigarettesSmokedMonth = Math.max(0, report?.totals.cigarettesSmokedMonth ?? 0);
  const relapseDaysMonth = Math.max(0, report?.totals.relapseDaysMonth ?? 0);
  const consistencyValue = report == null
    ? "--"
    : report.totals.daysTracked > 0
    ? `${report.totals.consistencyPct}%`
    : "--";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
                return;
              }
              navigation.navigate("Tabs");
            }}
            hitSlop={8}
          >
            <Text style={styles.backText}>{t("close")}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t("monthly_report.title")}</Text>
          <View style={styles.headerRightSpacer} />
        </View>
        <MonthPickerPill
          label={monthLabel}
          disablePrev={!canGoPrev}
          disableNext={!canGoNext}
          onPrev={() => canGoPrev && switchMonth(monthKeys[selectedIndex + 1])}
          onNext={() => canGoNext && switchMonth(monthKeys[selectedIndex - 1])}
        />

        {loading || report == null ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator />
          </View>
        ) : (
          <Animated.View style={{ opacity: contentOpacity }}>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>
                {profile.isPremium ? t("monthly_report.consistency") : t("monthly_report.preview")}
              </Text>
              <Text style={styles.heroValue}>{consistencyValue}</Text>
              <Text style={styles.heroSub}>
                {t("monthly_report.days_tracked", {
                  smokeFree: report.totals.daysSmokeFree,
                  tracked: report.totals.daysTracked,
                })}
              </Text>
            </View>

            {noTracking ? (
              <View style={styles.emptyHint}>
                <Text style={styles.emptyHintText}>{t("monthly_report.no_tracking")}</Text>
              </View>
            ) : null}

            <View style={styles.grid}>
              <ReportCard
                delayMs={40}
                title={t("monthly_report.cravings_beaten")}
                value={String(report.totals.cravingsBeaten)}
              />
              <ReportCard
                delayMs={80}
                title={t("monthly_report.money_saved")}
                value={formatMoney(report.totals.moneySavedMonth)}
                subtitle={t("monthly_report.total_small", {
                  total: formatMoney(report.totals.moneySavedTotal),
                })}
              />
              <ReportCard
                delayMs={100}
                title={t("monthly_report.cigs_smoked")}
                value={cigarettesSmokedMonth.toLocaleString(i18n.language || "fr")}
              />
              <ReportCard
                delayMs={110}
                title={t("monthly_report.relapse_days")}
                value={relapseDaysMonth.toLocaleString(i18n.language || "fr")}
              />
              {profile.isPremium ? (
                <>
                  <ReportCard
                    delayMs={120}
                    title={t("monthly_report.cigs_avoided")}
                    value={String(report.totals.cigarettesAvoidedMonth)}
                    subtitle={t("monthly_report.total_small", {
                      total: report.totals.cigarettesAvoidedTotal.toLocaleString(i18n.language || "fr"),
                    })}
                  />
                  <ReportCard delayMs={160} title={t("monthly_report.trends")}>
                    <View style={styles.trendRow}>
                      <Text style={styles.trendLabel}>{t("monthly_report.consistency")}</Text>
                      <Text style={styles.trendValue}>{formatDelta(report.trends?.consistencyDeltaPct, "%")}</Text>
                    </View>
                    <View style={styles.trendRow}>
                      <Text style={styles.trendLabel}>{t("monthly_report.cravings_beaten")}</Text>
                      <Text style={styles.trendValue}>{formatDelta(report.trends?.cravingsDelta)}</Text>
                    </View>
                    <View style={styles.trendRow}>
                      <Text style={styles.trendLabel}>{t("monthly_report.money_saved")}</Text>
                      <Text style={styles.trendValue}>{formatDelta(report.trends?.moneyDelta, "EUR")}</Text>
                    </View>
                  </ReportCard>
                  <ReportCard
                    delayMs={200}
                    title={t("monthly_report.sensitive_hours")}
                    value={
                      report.sensitive?.topHours?.length
                        ? report.sensitive.topHours.map((hour) => `${hour}h`).join(" | ")
                        : "--"
                    }
                  />
                  <ReportCard
                    delayMs={240}
                    title={t("monthly_report.insight_title")}
                    value={t(report.insight?.key || "monthly_report.insight.keep_going", report.insight?.params)}
                  />
                </>
              ) : (
                <>
                  <LockedReportCard
                    title={t("monthly_report.trends")}
                    subtitle={t("monthly_report.unlock_subtitle")}
                    onPress={() => setPaywallOpen(true)}
                  />
                  <LockedReportCard
                    title={t("monthly_report.sensitive_hours")}
                    subtitle={t("monthly_report.unlock_subtitle")}
                    onPress={() => setPaywallOpen(true)}
                  />
                  <LockedReportCard
                    title={t("monthly_report.insight_title")}
                    subtitle={t("monthly_report.unlock_subtitle")}
                    onPress={() => setPaywallOpen(true)}
                  />
                </>
              )}
            </View>

            {profile.isPremium ? (
              <View style={styles.historyBlock}>
                <Text style={styles.historyTitle}>{t("monthly_report.history")}</Text>
                {historyRows.map((item) => (
                  <View key={item.monthKey} style={styles.historyRow}>
                    <Text style={styles.historyMonth}>{getMonthLabel(item.monthKey, i18n.language || "fr")}</Text>
                    <Text style={styles.historyStat}>{item.totals.consistencyPct}%</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Pressable style={styles.unlockCard} onPress={() => setPaywallOpen(true)}>
                <Text style={styles.unlockTitle}>{t("monthly_report.unlock_title")}</Text>
                <Text style={styles.unlockSub}>{t("monthly_report.unlock_subtitle")}</Text>
                <Text style={styles.unlockCta}>{t("monthly_report.unlock_cta")}</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <PaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlock={unlockPremium}
        savedAmountLabel={formatMoney(report?.totals.moneySavedTotal ?? 0)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xl,
  },
  headerRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  backText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 18,
  },
  headerRightSpacer: {
    width: 44,
  },
  loaderWrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    marginTop: theme.spacing.md,
    backgroundColor: "#131821",
    borderWidth: 1,
    borderColor: "#273040",
    borderRadius: theme.radius.xl,
    padding: 22,
  },
  heroLabel: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  heroValue: {
    marginTop: 10,
    color: theme.colors.textPrimary,
    fontSize: 44,
    fontWeight: "900",
  },
  heroSub: {
    marginTop: 6,
    color: theme.colors.textTertiary,
    fontSize: 13,
  },
  emptyHint: {
    marginTop: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    padding: 12,
  },
  emptyHintText: {
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
  grid: {
    marginTop: theme.spacing.md,
    gap: 10,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  trendLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  trendValue: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  historyBlock: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 14,
    gap: 8,
  },
  historyTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyMonth: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: "capitalize",
  },
  historyStat: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  unlockCard: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.4)",
    backgroundColor: "rgba(74,222,128,0.1)",
    padding: 16,
  },
  unlockTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 15,
  },
  unlockSub: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  unlockCta: {
    marginTop: 10,
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
