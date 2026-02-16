import React, { useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import Screen from "../components/Screen";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getNumber, getString, setNumber, setString } from "../storage/mmkv";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);

  const quitDate = getString(StorageKeys.quitDate) ?? new Date().toISOString().slice(0, 10);
  const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
  const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
  const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;

  return (
    <Screen>
      <Text style={styles.title}>{t("settings")}</Text>

      <View style={styles.block}>
        <Row label={t("quitDate")} value={quitDate} />
        <Row label={t("cigsPerDay")} value={`${cigsPerDay}`} />
        <Row label={t("pricePerPack")} value={`${pricePerPack} €`} />
        <Row label={t("cigsPerPack")} value={`${cigsPerPack}`} />
      </View>

      <View style={{ height: theme.spacing.sm }} />

      <View style={styles.block}>
        <Text style={styles.section}>{t("language")}</Text>
        <Text style={styles.hint}>{t("languageAuto")}</Text>
      </View>

      <View style={{ height: theme.spacing.sm }} />

      <View style={styles.block}>
        <Text style={styles.section}>{t("editInputs")}</Text>
        <Text style={styles.hint}>
          (MVP) Modifie ici en code ou ajoute plus tard un formulaire / stepper.
        </Text>

        <Chip
          title={t("startToday")}
          onPress={() => {
            setString(StorageKeys.quitDate, new Date().toISOString().slice(0, 10));
            setTick((x) => x + 1);
          }}
        />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Chip({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.9 }]}>
      <Text style={styles.chipText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.textPrimary, fontSize: theme.typography.h2.fontSize, fontWeight: "700" },

  block: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
  },

  section: { color: theme.colors.textPrimary, fontWeight: "700", marginBottom: 8 },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  rowLabel: { color: theme.colors.textSecondary },
  rowValue: { color: theme.colors.textPrimary, fontWeight: "600" },

  hint: { color: theme.colors.textTertiary, marginBottom: 12 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  chipText: { color: theme.colors.textPrimary, fontWeight: "700" },
});
