import React, { useMemo } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import LineChart from "../components/LineChart";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getBool, getNumber, getString } from "../storage/mmkv";
import { daysSince, moneySaved } from "../utils/calculations";
import { formatCurrencyEUR } from "../utils/format";

export default function ProgressScreen() {
  const { t } = useTranslation();
  const isPremium = getBool(StorageKeys.isPremium) ?? false;

  const quitDate = getString(StorageKeys.quitDate) ?? new Date().toISOString().slice(0, 10);
  const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
  const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
  const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;

  const days = daysSince(quitDate);
  const totalSaved = moneySaved(days, cigsPerDay, cigsPerPack, pricePerPack);

  const series = useMemo(() => {
    const points = 14;
    const arr: number[] = [];
    for (let i = points - 1; i >= 0; i--) {
      const d = Math.max(0, days - i);
      arr.push(moneySaved(d, cigsPerDay, cigsPerPack, pricePerPack));
    }
    return arr;
  }, [days, cigsPerDay, cigsPerPack, pricePerPack]);

  return (
    <Screen>
      <Text style={styles.title}>{t("progress")}</Text>

      <View style={styles.chartBox}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t("moneySaved")}</Text>
          <Text style={styles.chartValue}>{formatCurrencyEUR(totalSaved)}</Text>
        </View>

        {isPremium ? (
          <LineChart width={320} height={180} data={series} />
        ) : (
          <Text style={styles.locked}>{t("chartsPremium")}</Text>
        )}
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
  timeline: { marginTop: theme.spacing.md },
  item: { color: theme.colors.textPrimary, marginBottom: 12 },
  lockedText: { color: theme.colors.textTertiary },
});
