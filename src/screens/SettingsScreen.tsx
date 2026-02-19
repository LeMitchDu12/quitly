import React, { useMemo, useState } from "react";
import { Text, View, StyleSheet, Pressable, Alert, Platform, ScrollView } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
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
import PaywallModal from "../components/PaywallModal";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { requestNotifPermissions, scheduleMotivationReminders, cancelAllNotifications } from "../notifications";
import { NotificationTime, readNotificationTimes, saveNotificationTimes } from "../storage/notificationTimes";
import { todayLocalISODate } from "../utils/date";
import { formatCurrencyEUR } from "../utils/format";

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

export default function SettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [, setTick] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [notificationTimes, setNotificationTimes] = useState<NotificationTime[]>(() => readNotificationTimes());
  const [timeEditorVisible, setTimeEditorVisible] = useState(false);
  const [editingTime, setEditingTime] = useState<number>(0);
  const [pendingTime, setPendingTime] = useState<NotificationTime>({ hour: 9, minute: 0 });
  const [pickerDate, setPickerDate] = useState(new Date());

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

  const rescheduleIfActive = async (times: NotificationTime[]) => {
    if (!notificationsEnabled || !isPremium) return;
    try {
      await scheduleMotivationReminders(times);
    } catch {
      // ignore silently
    }
  };

  const setLang = async (lng: "fr" | "en") => {
    await i18n.changeLanguage(lng);
    setString(StorageKeys.language, lng);
    const enabled = getBool(StorageKeys.notificationsEnabled) ?? true;
    if (enabled && isPremium) {
      await scheduleMotivationReminders(readNotificationTimes());
    }
    refresh();
  };

  const openTimePicker = (index: number) => {
    const target = notificationTimes[index] ?? { hour: 9, minute: 0 };
    const readyDate = new Date();
    readyDate.setHours(target.hour, target.minute, 0, 0);
    setPickerDate(readyDate);
    setEditingTime(index);
    setPendingTime(target);
    setTimeEditorVisible(true);
  };

  const handleTimeChange = async (_: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    setPickerDate(selected);
    setPendingTime({ hour: selected.getHours(), minute: selected.getMinutes() });
  };

  const persistNotificationTimes = async (times: NotificationTime[]) => {
    const sorted = [...times].sort((a, b) => (a.hour - b.hour) || (a.minute - b.minute));
    setNotificationTimes(sorted);
    saveNotificationTimes(sorted);
    setEditingTime((prev) => (sorted.length === 0 ? 0 : Math.min(prev, sorted.length - 1)));
    await rescheduleIfActive(sorted);
  };

  const addReminderTime = async () => {
    if (notificationTimes.length >= 3) return;
    const newTimes = [...notificationTimes, { hour: 9, minute: 0 }];
    await persistNotificationTimes(newTimes);
    setEditingTime(newTimes.length - 1);
    setPendingTime(newTimes[newTimes.length - 1]);
    setTimeEditorVisible(true);
  };

  const removeReminderTime = async (index: number) => {
    const updated = notificationTimes.filter((_, idx) => idx !== index);
    await persistNotificationTimes(updated);
    if (updated.length === 0) {
      setTimeEditorVisible(false);
    }
  };

  const confirmTimeChange = async () => {
    const targetIndex = editingTime >= notificationTimes.length ? 0 : editingTime;
    const updated = [...notificationTimes];
    updated[targetIndex] = pendingTime;
    setTimeEditorVisible(false);
    await persistNotificationTimes(updated);
  };

  const cancelTimeChange = () => {
    setTimeEditorVisible(false);
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
        await scheduleMotivationReminders(notificationTimes);
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

  const unlockPremium = () => {
    setBool(StorageKeys.isPremium, true);
    refresh();
    setPaywallOpen(false);
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
          {notificationsEnabled && isPremium && (
            <>
              {notificationTimes.length > 0 ? (
                <>
                  <Text style={styles.hint}>
                    {t("notificationsScheduledAtTimes", {
                      times: notificationTimes.map(formatReminderTime).join(" • "),
                    })}
                  </Text>
                  <View style={styles.notificationList}>
                    {notificationTimes.map((time, index) => (
                      <View key={`${formatReminderTime(time)}-${index}`} style={styles.reminderRow}>
                        <Pressable
                          style={[
                            styles.reminderRowLabel,
                            editingTime === index && styles.reminderRowLabelActive,
                          ]}
                          onPress={() => openTimePicker(index)}
                        >
                          <Text
                            style={[
                              styles.reminderRowText,
                              editingTime === index && styles.reminderRowTextActive,
                            ]}
                          >
                            {formatReminderTime(time)}
                          </Text>
                        </Pressable>
                        <Pressable style={styles.timeRemoveIcon} onPress={() => removeReminderTime(index)}>
                          <Text style={styles.timeRemoveText}>×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.hint}>{t("notificationsNoRemindersHint")}</Text>
              )}
              <View style={styles.addReminderWrapper}>
                <SecondaryButton title={t("notificationsAddReminder")} onPress={addReminderTime} />
              </View>
              {notificationTimes.length >= 3 && (
                <Text style={styles.hint}>{t("notificationsMaxReminders")}</Text>
              )}
            </>
          )} 
          
          { !isPremium && (
            <View style={styles.notificationLocked}>
              <Text style={styles.hint}>{t("notificationsPremiumHint")}</Text>
              <View style={{ height: theme.spacing.sm }} />
              <SecondaryButton title={t("unlock")} onPress={() => setPaywallOpen(true)} />
            </View>
          )}

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
  notificationList: { marginTop: theme.spacing.sm },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  timeLabel: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.elevated,
  },
  notificationValue: { color: theme.colors.textPrimary, fontWeight: "700" },
  timeRemove: { marginLeft: 10, padding: 6 },
  timeRemoveDisabled: { opacity: 0.4 },
  timeRemoveText: { color: theme.colors.danger, fontWeight: "700", fontSize: 18 },
  timeRemoveIcon: { marginLeft: 8, padding: 4 },
  notificationLocked: {
    marginTop: theme.spacing.sm,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  timePickerCard: {
    marginTop: theme.spacing.sm,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.elevated,
  },
  timePickerLabel: {
    color: theme.colors.textSecondary,
    marginBottom: 6,
    fontSize: 12,
  },
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
  reminderRowLabelActive: {
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  reminderRowText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  reminderRowTextActive: {
    color: theme.colors.primary,
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
  editorActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    gap: 18,
  },
  editorButtonWrapper: {
    flex: 1,
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
    paddingRight: theme.spacing.sm,    
    paddingLeft: theme.spacing.sm,    
  },
  addReminderWrapper: {
    marginTop: theme.spacing.sm,
  },
});
