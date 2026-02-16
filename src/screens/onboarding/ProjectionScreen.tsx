import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import { theme } from "../../theme";
import { RootStackParamList } from "../../navigation/Root";
import { StorageKeys } from "../../storage/keys";
import { getNumber, getString } from "../../storage/mmkv";
import { moneySaved } from "../../utils/calculations";
import { formatCurrencyEUR } from "../../utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "Projection">;

export default function ProjectionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const quitDate = getString(StorageKeys.quitDate) ?? new Date().toISOString().slice(0, 10);
  const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
  const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
  const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;

  const days = 365;
  const saved = moneySaved(days, cigsPerDay, cigsPerPack, pricePerPack);
  const savedLabel = formatCurrencyEUR(saved);
  const avoided = Math.floor(days * cigsPerDay);

  return (
    <Screen>
      <Text style={styles.title}>{t("projectionTitle")}</Text>
      <Text style={styles.subtitle}>{t("projectionSubtitle")}</Text>

      <View style={styles.heroCard}>
        <Text style={styles.big}>{savedLabel}</Text>
        <Text style={styles.heroLabel}>{t("saved")}</Text>

        <View style={{ height: 16 }} />

        <Text style={styles.big}>{avoided.toLocaleString()}</Text>
        <Text style={styles.heroLabel}>{t("cigarettesAvoided")}</Text>
      </View>

      <Text style={styles.note}>{t("projectionNote")}</Text>

      <View style={{ flex: 1 }} />

      <PrimaryButton title={t("continue")} onPress={() => navigation.navigate("Paywall")} />
      <Text style={styles.tiny}>{t("projectionQuitDate", { date: quitDate })}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.textPrimary, fontSize: theme.typography.h2.fontSize, fontWeight: "700" },
  subtitle: { color: theme.colors.textSecondary, marginTop: 8 },
  heroCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 22,
    alignItems: "center",
  },
  big: { color: theme.colors.textPrimary, fontSize: 34, fontWeight: "800" },
  heroLabel: { color: theme.colors.textSecondary, marginTop: 6 },
  note: { color: theme.colors.textSecondary, marginTop: 18, textAlign: "center" },
  tiny: { color: theme.colors.textTertiary, marginTop: 12, textAlign: "center", fontSize: 12 },
});
