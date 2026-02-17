import React, { useState } from "react";
import { Text, View, StyleSheet, Pressable, Alert, Platform, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import { theme } from "../theme";
import i18n from "../i18n";
import { RootStackParamList } from "../navigation/Root";
import { StorageKeys } from "../storage/keys";
import { clearStorage, getNumber, getString, getBool, setBool, setString } from "../storage/mmkv";
import { requestNotifPermissions, scheduleDailyMotivation, cancelAllNotifications } from "../notifications";
import { todayLocalISODate } from "../utils/date";

function Chip({
  title,
  onPress,
  tone = "default",
}: {
  title: string;
  onPress: () => void;
  tone?: "default" | "primary" | "danger";
}) {
  const borderColor =
    tone === "primary"
      ? theme.colors.primary
      : tone === "danger"
      ? theme.colors.danger
      : theme.colors.outline;

  const textColor =
    tone === "primary"
      ? theme.colors.primary
      : tone === "danger"
      ? theme.colors.danger
      : theme.colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <Text style={[styles.chipText, { color: textColor }]}>{title}</Text>
    </Pressable>
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

export default function SettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [, setTick] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      setTick((x) => x + 1);
    }, [])
  );

  const quitDate = getString(StorageKeys.quitDate) ?? todayLocalISODate();
  const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
  const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
  const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;
  const isPremium = getBool(StorageKeys.isPremium) ?? false;
  const notificationsEnabled = getBool(StorageKeys.notificationsEnabled) ?? true;
  const language =
    (getString(StorageKeys.language) as "fr" | "en" | null) ??
    (i18n.language?.startsWith("fr") ? "fr" : "en");

  const refresh = () => setTick((x) => x + 1);

  const setLang = async (lng: "fr" | "en") => {
    await i18n.changeLanguage(lng);
    setString(StorageKeys.language, lng);
    if (getBool(StorageKeys.notificationsEnabled) ?? true) {
      await scheduleDailyMotivation(9, 0);
    }
    refresh();
  };

  const toggleNotifications = async () => {
    const next = !notificationsEnabled;
    setBool(StorageKeys.notificationsEnabled, next);
    refresh();
    try {
      if (next) {
        const ok = await requestNotifPermissions();
        if (!ok) {
          setBool(StorageKeys.notificationsEnabled, false);
          refresh();
          Alert.alert(t("settingsNotifPermissionTitle"), t("settingsNotifPermissionBody"));
          return;
        }
        await scheduleDailyMotivation(9, 0);
      } else {
        await cancelAllNotifications();
      }
    } catch {
      setBool(StorageKeys.notificationsEnabled, !next);
      refresh();
      Alert.alert(t("settingsNotifErrorTitle"), t("settingsNotifErrorBody"));
    }
  };

  const restorePurchases = async () => {
    Alert.alert(t("restore"), t("settingsRestoreNotConnected"));
  };

  const clearAppData = () => {
    Alert.alert(t("settingsClearTitle"), t("settingsClearBody"), [
      { text: t("settingsCancel"), style: "cancel" },
      {
        text: t("settingsClearAction"),
        style: "destructive",
        onPress: async () => {
          await cancelAllNotifications();
          await clearStorage();
          refresh();
        },
      },
    ]);
  };

  const notifLabel = notificationsEnabled ? t("settingsEnabled") : t("settingsDisabled");

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t("settings")}</Text>

        <View style={styles.block}>
          <Text style={styles.section}>{t("settingsProfile")}</Text>
          <Row label={t("quitDate")} value={quitDate} />
          <Row label={t("cigsPerDay")} value={`${cigsPerDay}`} />
          <Row label={t("pricePerPack")} value={`${pricePerPack} EUR`} />
          <Row label={t("cigsPerPack")} value={`${cigsPerPack}`} />
          <View style={styles.chipsRow}>
            <Chip title={t("settingsEditButton")} onPress={() => navigation.navigate("SettingsEdit")} />
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.section}>{t("settingsNotifications")}</Text>
          <Row label={t("settingsDailyMotivation")} value={notifLabel} />
          <View style={styles.chipsRow}>
            <Chip
              title={notificationsEnabled ? t("settingsDisable") : t("settingsEnable")}
              onPress={toggleNotifications}
              tone={notificationsEnabled ? "danger" : "primary"}
            />
          </View>
          <Text style={styles.hint}>{t("settingsNotifScheduledAt")}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.section}>{t("language")}</Text>
          <Row label={t("settingsCurrent")} value={language.toUpperCase()} />
          <View style={styles.chipsRow}>
            <Chip title="FR" onPress={() => setLang("fr")} tone={language === "fr" ? "primary" : "default"} />
            <Chip title="EN" onPress={() => setLang("en")} tone={language === "en" ? "primary" : "default"} />
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.section}>{t("premium")}</Text>
          <Row label={t("settingsStatus")} value={isPremium ? t("settingsEnabled") : t("settingsFree")} />
          <View style={styles.chipsRow}>
            <Chip title={t("restore")} onPress={restorePurchases} />
          </View>
          <Text style={styles.hint}>
            {Platform.OS === "ios" ? t("settingsSubsIOS") : t("settingsSubsAndroid")}
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.section}>{t("settingsData")}</Text>
          <Text style={styles.hint}>{t("settingsClearHint")}</Text>
          <View style={styles.chipsRow}>
            <Chip title={t("settingsClearAction")} onPress={clearAppData} tone="danger" />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xl },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "900",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  block: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  section: {
    color: theme.colors.textPrimary,
    fontWeight: "900",
    marginBottom: 8,
    fontSize: 16,
  },
  hint: {
    color: theme.colors.textTertiary,
    marginTop: 10,
    lineHeight: 18,
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  rowLabel: { color: theme.colors.textSecondary },
  rowValue: { color: theme.colors.textPrimary, fontWeight: "700" },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  chipText: { fontWeight: "900", fontSize: 13 },
});
