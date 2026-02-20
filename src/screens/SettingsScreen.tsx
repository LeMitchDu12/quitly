import React, { useState } from "react";
import { Text, View, StyleSheet, Pressable, Alert, Platform, ScrollView, Linking } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import { theme } from "../theme";
import i18n from "../i18n";
import { RootStackParamList } from "../navigation/Root";
import { StorageKeys } from "../storage/keys";
import { getNumber, getString, getBool, setBool, setString } from "../storage/mmkv";
import PaywallModal from "../components/PaywallModal";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { requestNotifPermissions, scheduleMotivationReminders, cancelAllNotifications } from "../notifications";
import {
  NotificationPlan,
  NotificationTime,
  readNotificationPlan,
  saveNotificationPlan,
} from "../storage/notificationTimes";
import { todayLocalISODate } from "../utils/date";
import { formatCurrencyEUR } from "../utils/format";
import { authenticateWithBiometrics, isBiometricAvailable } from "../security/useAppLock";
import {
  isMonthlyReportNotificationEnabled,
  isMonthlyReportNotificationFeatureEnabled,
  setMonthlyReportNotificationEnabled,
} from "../reports/reportStorage";
import {
  getLaunchMode,
  isPremium as hasPremiumEntitlement,
  isRevenueCatConfigured,
  restore as restoreRevenueCatPurchases,
} from "../purchases";

type EditorTarget = { kind: "check" } | { kind: "passive"; index: number } | null;

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

function formatReminderTime(time: NotificationTime) {
  const hh = String(time.hour).padStart(2, "0");
  const mm = String(time.minute).padStart(2, "0");
  return `${hh}:${mm}`;
}

function sortTimes(times: NotificationTime[]) {
  return [...times].sort((a, b) => a.hour - b.hour || a.minute - b.minute);
}

function formatDateForLanguage(dateISO: string, language: "fr" | "en") {
  const date = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateISO;
  const locale = language === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [, setTick] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [notificationPlan, setNotificationPlan] = useState<NotificationPlan>(() => readNotificationPlan());
  const [timeEditorVisible, setTimeEditorVisible] = useState(false);
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [pendingTime, setPendingTime] = useState<NotificationTime>({ hour: 9, minute: 0 });
  const [pickerDate, setPickerDate] = useState(new Date());
  const [biometricReady, setBiometricReady] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setTick((x) => x + 1);
      setNotificationPlan(readNotificationPlan());
      isBiometricAvailable()
        .then(setBiometricReady)
        .catch(() => setBiometricReady(false));
    }, [])
  );

  const quitDate = getString(StorageKeys.quitDate) ?? todayLocalISODate();
  const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
  const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
  const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;
  const isPremium = getBool(StorageKeys.isPremium) ?? false;
  const notificationsEnabledPref = getBool(StorageKeys.notificationsEnabled) ?? false;
  const notificationsEnabled = notificationsEnabledPref && isPremium;
  const launchMode = getLaunchMode();
  const needsRevenueCatReminder = launchMode !== "expo_go" && !isRevenueCatConfigured();
  const monthlyReportNotifFeatureEnabled = isMonthlyReportNotificationFeatureEnabled();
  const monthlyReportNotifEnabled = isMonthlyReportNotificationEnabled();
  const lockEnabled = getBool(StorageKeys.securityLockEnabled) ?? false;
  const biometricPreferred = getBool(StorageKeys.securityBiometricPreferred) ?? true;
  const language =
    (getString(StorageKeys.language) as "fr" | "en" | null) ??
    (i18n.language?.startsWith("fr") ? "fr" : "en");
  const quitDateLabel = formatDateForLanguage(quitDate, language);

  const refresh = () => setTick((x) => x + 1);

  const rescheduleIfActive = async (plan: NotificationPlan) => {
    if (!notificationsEnabled || !isPremium) return;
    try {
      await scheduleMotivationReminders(plan);
    } catch {
      // Ignore to keep settings responsive.
    }
  };

  const persistNotificationPlan = async (plan: NotificationPlan) => {
    const clean: NotificationPlan = {
      check: plan.check,
      passive: sortTimes(plan.passive).slice(0, 2),
    };
    setNotificationPlan(clean);
    saveNotificationPlan(clean);
    await rescheduleIfActive(clean);
  };

  const setLang = async (lng: "fr" | "en") => {
    await i18n.changeLanguage(lng);
    setString(StorageKeys.language, lng);
    const enabled = getBool(StorageKeys.notificationsEnabled) ?? false;
    if (enabled && isPremium) {
      await scheduleMotivationReminders(readNotificationPlan());
    }
    refresh();
  };

  const openTimePicker = (target: EditorTarget, time: NotificationTime) => {
    if (!target) return;
    const readyDate = new Date();
    readyDate.setHours(time.hour, time.minute, 0, 0);
    setPickerDate(readyDate);
    setPendingTime(time);
    setEditorTarget(target);
    setTimeEditorVisible(true);
  };

  const addCheckReminder = async () => {
    if (notificationPlan.check) {
      openTimePicker({ kind: "check" }, notificationPlan.check);
      return;
    }
    const next = { ...notificationPlan, check: { hour: 9, minute: 0 } };
    await persistNotificationPlan(next);
    openTimePicker({ kind: "check" }, next.check!);
  };

  const removeCheckReminder = async () => {
    const next = { ...notificationPlan, check: null };
    await persistNotificationPlan(next);
    setTimeEditorVisible(false);
  };

  const addPassiveReminder = async () => {
    if (notificationPlan.passive.length >= 2) return;
    const updatedPassive = [...notificationPlan.passive, { hour: 18, minute: 0 }];
    const next = { ...notificationPlan, passive: sortTimes(updatedPassive) };
    await persistNotificationPlan(next);
    const index = next.passive.length - 1;
    openTimePicker({ kind: "passive", index }, next.passive[index]!);
  };

  const removePassiveReminder = async (index: number) => {
    const updatedPassive = notificationPlan.passive.filter((_, idx) => idx !== index);
    const next = { ...notificationPlan, passive: updatedPassive };
    await persistNotificationPlan(next);
    setTimeEditorVisible(false);
  };

  const handleTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    setPickerDate(selected);
    setPendingTime({ hour: selected.getHours(), minute: selected.getMinutes() });
  };

  const confirmTimeChange = async () => {
    if (!editorTarget) {
      setTimeEditorVisible(false);
      return;
    }

    if (editorTarget.kind === "check") {
      const next = { ...notificationPlan, check: pendingTime };
      setTimeEditorVisible(false);
      await persistNotificationPlan(next);
      return;
    }

    const idx = editorTarget.index;
    if (idx < 0 || idx >= notificationPlan.passive.length) {
      setTimeEditorVisible(false);
      return;
    }
    const updatedPassive = [...notificationPlan.passive];
    updatedPassive[idx] = pendingTime;
    const next = { ...notificationPlan, passive: sortTimes(updatedPassive) };
    setTimeEditorVisible(false);
    await persistNotificationPlan(next);
  };

  const cancelTimeChange = () => {
    setTimeEditorVisible(false);
    setEditorTarget(null);
  };

  const toggleNotifications = async () => {
    const next = !notificationsEnabled;
    setBool(StorageKeys.notificationsEnabled, next);
    refresh();
    try {
      if (next) {
        if (!isPremium) {
          setBool(StorageKeys.notificationsEnabled, false);
          refresh();
          setPaywallOpen(true);
          return;
        }
        const ok = await requestNotifPermissions();
        if (!ok) {
          setBool(StorageKeys.notificationsEnabled, false);
          refresh();
          Alert.alert(t("settingsNotifPermissionTitle"), t("settingsNotifPermissionBody"));
          return;
        }
        await scheduleMotivationReminders(notificationPlan);
      } else {
        await cancelAllNotifications();
      }
    } catch {
      setBool(StorageKeys.notificationsEnabled, !next);
      refresh();
      Alert.alert(t("settingsNotifErrorTitle"), t("settingsNotifErrorBody"));
    }
  };

  const toggleMonthlyReportNotification = () => {
    setMonthlyReportNotificationEnabled(!monthlyReportNotifEnabled);
    refresh();
  };

  const handleRestorePurchases = async () => {
    try {
      const info = await restoreRevenueCatPurchases();
      const premium = hasPremiumEntitlement(info);
      setBool(StorageKeys.isPremium, premium);
      refresh();
      if (premium) {
        Alert.alert(t("restore"), t("paywallPremiumEnabled"));
      } else {
        Alert.alert(t("restore"), t("settingsNoActiveSubscription"));
      }
    } catch {
      Alert.alert(t("settingsNotifErrorTitle"), t("purchasesUnavailableExpoGo"));
    }
  };

  const openManageSubscription = async () => {
    const url = "https://apps.apple.com/account/subscriptions";
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(t("settingsNotifErrorTitle"), t("settingsManageSubscriptionError"));
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("settingsNotifErrorTitle"), t("settingsManageSubscriptionError"));
    }
  };

  const unlockPremium = () => {
    setBool(StorageKeys.isPremium, true);
    refresh();
    setPaywallOpen(false);
  };

  const notifLabel = notificationsEnabled ? t("settingsEnabled") : t("settingsDisabled");

  const toggleAppLock = async () => {
    if (!biometricReady) return;
    const ok = await authenticateWithBiometrics(t("lockPrompt"));
    if (!ok) return;
    const next = !lockEnabled;
    setBool(StorageKeys.securityLockEnabled, next);
    if (next) {
      setBool(StorageKeys.securityBiometricPreferred, true);
    }
    refresh();
  };

  const toggleBiometricPreferred = () => {
    setBool(StorageKeys.securityBiometricPreferred, !biometricPreferred);
    refresh();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t("settings")}</Text>

        <View style={styles.block}>
          <Text style={styles.section}>{t("settingsProfile")}</Text>
          <Row label={t("quitDate")} value={quitDateLabel} />
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

          {notificationsEnabled && isPremium && (
            <>
              <View style={styles.notificationGroup}>
                <Text style={styles.groupTitle}>{t("notificationsCheckTitle")}</Text>
                {notificationPlan.check ? (
                  <View style={styles.reminderRow}>
                    <Pressable
                      style={styles.reminderRowLabel}
                      onPress={() => openTimePicker({ kind: "check" }, notificationPlan.check!)}
                    >
                      <Text style={styles.reminderRowText}>{formatReminderTime(notificationPlan.check)}</Text>
                    </Pressable>
                    <Pressable style={styles.timeRemoveIcon} onPress={removeCheckReminder}>
                      <Text style={styles.timeRemoveText}>x</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.hint}>{t("notificationsNoCheckHint")}</Text>
                )}
                {!notificationPlan.check && (
                  <View style={styles.addReminderWrapper}>
                    <SecondaryButton title={t("notificationsAddCheck")} onPress={addCheckReminder} />
                  </View>
                )}
              </View>

              <View style={styles.notificationGroup}>
                <Text style={styles.groupTitle}>{t("notificationsPassiveTitle")}</Text>
                {notificationPlan.passive.length > 0 ? (
                  <View style={styles.notificationList}>
                    {notificationPlan.passive.map((time, index) => (
                      <View key={`${formatReminderTime(time)}-${index}`} style={styles.reminderRow}>
                        <Pressable
                          style={styles.reminderRowLabel}
                          onPress={() => openTimePicker({ kind: "passive", index }, time)}
                        >
                          <Text style={styles.reminderRowText}>{formatReminderTime(time)}</Text>
                        </Pressable>
                        <Pressable style={styles.timeRemoveIcon} onPress={() => removePassiveReminder(index)}>
                          <Text style={styles.timeRemoveText}>x</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.hint}>{t("notificationsNoPassiveHint")}</Text>
                )}
                <View style={styles.addReminderWrapper}>
                  <SecondaryButton title={t("notificationsAddPassive")} onPress={addPassiveReminder} />
                </View>
                {notificationPlan.passive.length >= 2 && (
                  <Text style={styles.hint}>{t("notificationsMaxPassive")}</Text>
                )}
              </View>
            </>
          )}

          {!isPremium && (
            <View style={styles.notificationLocked}>
              <Text style={styles.hint}>{t("notificationsPremiumHint")}</Text>
              <View style={{ height: theme.spacing.sm }} />
              <SecondaryButton title={t("unlock")} onPress={() => setPaywallOpen(true)} />
            </View>
          )}

          {isPremium && monthlyReportNotifFeatureEnabled && (
            <View style={styles.notificationGroup}>
              <Text style={styles.groupTitle}>{t("settingsMonthlyReportReady")}</Text>
              <Text style={styles.hint}>{t("settingsMonthlyReportReadyHint")}</Text>
              <View style={styles.chipsRow}>
                <Chip
                  title={monthlyReportNotifEnabled ? t("settingsDisable") : t("settingsEnable")}
                  onPress={toggleMonthlyReportNotification}
                  tone={monthlyReportNotifEnabled ? "danger" : "primary"}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.section}>{t("settingsSecurity")}</Text>
          <View style={styles.securityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t("securityLockTitle")}</Text>
              <Text style={styles.hint}>{t("securityLockSubtitle")}</Text>
            </View>
            <Pressable
              onPress={toggleAppLock}
              disabled={!biometricReady}
              style={[
                styles.securitySwitch,
                lockEnabled && biometricReady ? styles.securitySwitchOn : styles.securitySwitchOff,
                !biometricReady && styles.securitySwitchDisabled,
              ]}
            >
              <View style={[styles.securityThumb, lockEnabled && biometricReady ? styles.securityThumbOn : null]} />
            </Pressable>
          </View>
          {!biometricReady ? <Text style={styles.hint}>{t("securityLockUnavailable")}</Text> : null}
          {biometricReady && lockEnabled ? (
            <View style={[styles.securityRow, { marginTop: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{t("securityBiometricPreferredTitle")}</Text>
                <Text style={styles.hint}>{t("securityBiometricPreferredSubtitle")}</Text>
              </View>
              <Pressable
                onPress={toggleBiometricPreferred}
                style={[
                  styles.securitySwitch,
                  biometricPreferred ? styles.securitySwitchOn : styles.securitySwitchOff,
                ]}
              >
                <View style={[styles.securityThumb, biometricPreferred ? styles.securityThumbOn : null]} />
              </Pressable>
            </View>
          ) : null}
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
            <Chip title={t("restore")} onPress={handleRestorePurchases} />
            <Chip title={t("manageSubscription")} onPress={openManageSubscription} />
          </View>
          {needsRevenueCatReminder ? <Text style={styles.hint}>{t("settingsRevenueCatReminder")}</Text> : null}
          <Text style={styles.hint}>
            {Platform.OS === "ios" ? t("settingsSubsIOS") : t("settingsSubsAndroid")}
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.section}>{t("settingsData")}</Text>
          <Pressable style={styles.linkRow} onPress={() => navigation.navigate("PrivacyPolicy")}>
            <Text style={styles.linkRowLabel}>{t("settingsPrivacyPolicy")}</Text>
            <Text style={styles.linkRowArrow}>›</Text>
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => navigation.navigate("ResetData")}>
            <Text style={[styles.linkRowLabel, { color: theme.colors.danger }]}>{t("settingsResetAllData")}</Text>
            <Text style={styles.linkRowArrow}>›</Text>
          </Pressable>
          <Text style={styles.hint}>{t("settingsClearHint")}</Text>
        </View>
      </ScrollView>

      {timeEditorVisible && (
        <View style={styles.timeEditorOverlay}>
          <View style={styles.timeEditor}>
            <Text style={styles.timeEditorTitle}>{t("notificationsEditTitle")}</Text>
            <View style={styles.editorPickerWrap}>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                is24Hour
                display="spinner"
                onChange={handleTimeChange}
                textColor={theme.colors.textPrimary}
                style={styles.editorPicker}
              />
            </View>
            <View style={styles.editorActions}>
              <View style={styles.editorButtonWrapper}>
                <SecondaryButton title={t("settingsCancel")} onPress={cancelTimeChange} />
              </View>
              <View style={styles.editorButtonWrapper}>
                <PrimaryButton title={t("settingsSave")} onPress={confirmTimeChange} />
              </View>
            </View>
          </View>
        </View>
      )}

      <PaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlock={unlockPremium}
        savedAmountLabel={formatCurrencyEUR(0)}
      />
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
  groupTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    marginTop: theme.spacing.md,
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
  notificationGroup: { marginTop: theme.spacing.sm },
  notificationList: { marginTop: theme.spacing.xs },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
  },
  reminderRowLabel: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.elevated,
  },
  reminderRowText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  timeRemoveIcon: { marginLeft: 8, padding: 4 },
  timeRemoveText: { color: theme.colors.danger, fontWeight: "700", fontSize: 18 },
  addReminderWrapper: {
    marginTop: theme.spacing.sm,
  },
  notificationLocked: {
    marginTop: theme.spacing.sm,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  securitySwitch: {
    width: 54,
    height: 32,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  securitySwitchOn: {
    backgroundColor: "rgba(74,222,128,0.45)",
  },
  securitySwitchOff: {
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  securitySwitchDisabled: {
    opacity: 0.45,
  },
  securityThumb: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: theme.colors.textPrimary,
    transform: [{ translateX: 0 }],
  },
  securityThumbOn: {
    transform: [{ translateX: 24 }],
    backgroundColor: "#0F1115",
  },
  timeEditorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  timeEditor: {
    width: "90%",
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  timeEditorTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "900",
    marginBottom: theme.spacing.sm,
  },
  editorPickerWrap: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingVertical: theme.spacing.sm,
  },
  editorPicker: {
    alignSelf: "center",
    paddingHorizontal: theme.spacing.sm,
  },
  editorActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    gap: 18,
  },
  editorButtonWrapper: {
    flex: 1,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingVertical: 12,
  },
  linkRowLabel: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  linkRowArrow: {
    color: theme.colors.textTertiary,
    fontSize: 18,
    lineHeight: 18,
  },
});
