import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/Root";
import { resetAllUserData } from "../storage/reset";

export default function ResetDataScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const executeReset = async () => {
    setBusy(true);
    try {
      await resetAllUserData();
      navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
    } catch {
      Alert.alert(t("settingsNotifErrorTitle"), t("resetDataError"));
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(t("resetDataConfirmTitle"), t("resetDataConfirmBody"), [
      { text: t("settingsCancel"), style: "cancel" },
      {
        text: t("resetDataConfirmContinue"),
        style: "destructive",
        onPress: () => {
          Alert.alert(t("resetDataConfirmFinalTitle"), t("resetDataConfirmFinalBody"), [
            { text: t("settingsCancel"), style: "cancel" },
            { text: t("resetDataConfirmDelete"), style: "destructive", onPress: executeReset },
          ]);
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.sideSlot}>
            <Text style={styles.back}>{t("close")}</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {t("settingsResetAllData")}
          </Text>
          <View style={styles.sideSlot} />
        </View>

        <View style={styles.card}>
          <Text style={styles.body}>{t("resetDataDescription")}</Text>

          <Pressable
            disabled={busy}
            onPress={confirmReset}
            style={({ pressed }) => [styles.resetButton, pressed && !busy && { opacity: 0.9 }]}
          >
            {busy ? <ActivityIndicator color={theme.colors.textPrimary} /> : <Text style={styles.resetButtonText}>{t("resetDataAction")}</Text>}
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sideSlot: {
    width: 64,
  },
  back: { color: theme.colors.textSecondary, fontSize: 14 },
  title: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 18,
    textAlign: "center",
    marginHorizontal: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderColor: theme.colors.outline,
    borderWidth: 1,
    padding: 16,
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  resetButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.danger,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  resetButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 14,
  },
});
