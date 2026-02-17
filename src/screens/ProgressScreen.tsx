import React, { useCallback, useMemo, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import LineChart from "../components/LineChart";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getBool, getNumber, getString } from "../storage/mmkv";
import { daysSince, moneySaved } from "../utils/calculations";
import { formatCurrencyEUR } from "../utils/format";

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
    quitDate: getString(StorageKeys.quitDate) ?? new Date().toISOString().slice(0, 10),
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

export default function ProgressScreen() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProgressProfile>(() => readProfile());
  const { isPremium, quitDate, cigsPerDay, pricePerPack, cigsPerPack } = profile;

  useFocusEffect(
    useCallback(() => {
      setProfile(readProfile());
    }, [])
  );

  const days = daysSince(quitDate);
  const totalSaved = moneySaved(days, cigsPerDay, cigsPerPack, pricePerPack);

  const series = useMemo(() => {
    if (days <= 0) {
      const v = moneySaved(0, cigsPerDay, cigsPerPack, pricePerPack);
      return [v, v];
    }

    const points = Math.min(days + 1, 90);
    const arr: number[] = [];
    for (let i = 0; i < points; i++) {
      const d = Math.round((i * days) / (points - 1));
      arr.push(moneySaved(d, cigsPerDay, cigsPerPack, pricePerPack));
    }
    return arr;
  }, [days, cigsPerDay, cigsPerPack, pricePerPack]);
  const minSaved = Math.min(...series);
  const maxSaved = Math.max(...series);
  const quitDateLabel = formatDateForLocale(quitDate, i18n.language || "fr-FR");

  return (
    <Screen>
      <Text style={styles.title}>{t("progress")}</Text>

      <View style={styles.chartBox}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t("chartTitleSavings")}</Text>
          <Text style={styles.chartValue}>{formatCurrencyEUR(totalSaved)}</Text>
        </View>

        {isPremium ? (
          <LineChart width={320} height={180} data={series} />
        ) : (
          <Text style={styles.locked}>{t("chartsPremium")}</Text>
        )}

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

      <View style={styles.timeline}>
        <Text style={styles.item}>{t("timeline24h")}</Text>
        <Text style={styles.item}>{t("timeline1week")}</Text>
        <Text style={[styles.item, !isPremium && styles.lockedText]}>
          {isPremium ? t("timeline1month") : t("timeline1monthPremium")}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.textPrimary, fontSize: theme.typography.h2.fontSize, fontWeight: "800" },
  chartBox: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  chartHeader: { marginBottom: 10 },
  chartTitle: { color: theme.colors.textSecondary },
  chartValue: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "800", marginTop: 4 },
  locked: { color: theme.colors.textSecondary, textAlign: "center", paddingVertical: 70 },
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
  legendSubText: { color: theme.colors.textTertiary, fontSize: 12 },
  timeline: { marginTop: theme.spacing.md },
  item: { color: theme.colors.textPrimary, marginBottom: 12 },
  lockedText: { color: theme.colors.textTertiary },
});
