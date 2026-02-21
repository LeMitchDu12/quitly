import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { RootStackParamList } from "../navigation/Root";
import { theme } from "../theme";
import { StorageKeys } from "../storage/keys";
import { getNumber, getString, setNumber, setString } from "../storage/mmkv";
import { toLocalISODate, todayLocalISODate } from "../utils/date";
import { readResolvedLanguage } from "../localization/preferences";

type Props = NativeStackScreenProps<RootStackParamList, "SettingsEdit">;

function toISODate(d: Date) {
  return toLocalISODate(d);
}

function clampToToday(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return x > today ? today : x;
}

function parseISODate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - step))}>
          <Text style={styles.stepBtnText}>-</Text>
        </Pressable>
        <Text style={styles.stepValue}>
          {value} {suffix ?? ""}
        </Text>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + step))}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsEditScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const resolvedLanguage = readResolvedLanguage() ?? (i18n.resolvedLanguage?.startsWith("fr") ? "fr" : "en");
  const dateLocale = resolvedLanguage === "fr" ? "fr-FR" : "en-US";

  const initialQuitDate = getString(StorageKeys.quitDate) ?? todayLocalISODate();
  const initialDate = parseISODate(initialQuitDate);

  const [date, setDate] = useState<Date>(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === "ios");
  const [cigsPerDay, setCigsPerDay] = useState(getNumber(StorageKeys.cigsPerDay) ?? 12);
  const [pricePerPack, setPricePerPack] = useState(getNumber(StorageKeys.pricePerPack) ?? 12);
  const [cigsPerPack, setCigsPerPack] = useState(getNumber(StorageKeys.cigsPerPack) ?? 20);
  const leaveScreenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const prettyDate = useMemo(() => {
    return date.toLocaleDateString(dateLocale, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [date, dateLocale]);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (!selected) return;
    setDate(clampToToday(selected));
  };

  React.useEffect(() => {
    return () => {
      if (leaveScreenTimerRef.current) {
        clearTimeout(leaveScreenTimerRef.current);
      }
    };
  }, []);

  const closePickerAndGoBack = () => {
    if (leaveScreenTimerRef.current) {
      clearTimeout(leaveScreenTimerRef.current);
      leaveScreenTimerRef.current = null;
    }
    if (Platform.OS !== "ios") {
      navigation.goBack();
      return;
    }
    // Close iOS picker first to avoid native picker handoff crashes on the previous screen.
    setShowDatePicker(false);
    leaveScreenTimerRef.current = setTimeout(() => {
      navigation.goBack();
      leaveScreenTimerRef.current = null;
    }, 120);
  };

  const onSave = () => {
    setString(StorageKeys.quitDate, toISODate(date));
    setNumber(StorageKeys.cigsPerDay, Math.max(0, Math.min(80, cigsPerDay)));
    setNumber(StorageKeys.pricePerPack, Math.max(0, Math.min(50, pricePerPack)));
    setNumber(StorageKeys.cigsPerPack, Math.max(1, Math.min(40, cigsPerPack)));
    closePickerAndGoBack();
  };

  const onCancel = () => {
    closePickerAndGoBack();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t("settingsEditTitle")}</Text>

        <View style={styles.card}>
          <Text style={styles.section}>{t("quitDate")}</Text>

          {Platform.OS === "android" && (
            <View style={styles.quickRow}>
              <Pressable onPress={() => setShowDatePicker(true)} style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.9 }]}>
                <Text style={styles.quickText}>{t("setQuitDate")}</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.dateCard}>
            <Text style={styles.dateLabel}>{t("settingsSelectedDate")}</Text>
            <Text style={styles.dateBig}>{prettyDate}</Text>
            <Text style={styles.helper}>
              {Platform.OS === "ios" ? t("settingsDateHelperIOS") : t("settingsDateHelperAndroid")}
            </Text>
          </View>

          {showDatePicker ? (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={date}
                mode="date"
                maximumDate={today}
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onDateChange}
                locale={dateLocale}
                {...(Platform.OS === "ios" ? { themeVariant: "dark" as const } : {})}
                style={styles.datePicker}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Stepper label={t("cigsPerDay")} value={cigsPerDay} onChange={setCigsPerDay} min={0} max={80} />
          <Stepper label={t("pricePerPack")} value={pricePerPack} onChange={setPricePerPack} min={0} max={50} suffix="EUR" />
          <Stepper label={t("cigsPerPack")} value={cigsPerPack} onChange={setCigsPerPack} min={1} max={40} />
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <SecondaryButton title={t("settingsCancel")} onPress={onCancel} />
        <View style={{ height: theme.spacing.sm }} />
        <PrimaryButton title={t("settingsSave")} onPress={onSave} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 140 },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "900",
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  card: {
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
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  quickChip: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: "transparent",
  },
  quickChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.elevated },
  quickText: { color: theme.colors.textPrimary, fontWeight: "800", fontSize: 13 },
  quickTextActive: { color: theme.colors.primary },
  dateCard: {
    marginTop: 12,
    backgroundColor: theme.colors.elevated,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  dateLabel: { color: theme.colors.textTertiary, marginBottom: 8, fontWeight: "700" },
  dateBig: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: "900" },
  helper: { color: theme.colors.textTertiary, marginTop: 10, fontSize: 12 },
  pickerWrap: {
    marginTop: 12,
    backgroundColor: theme.colors.elevated,
    borderRadius: theme.radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: "hidden",
    alignItems: "stretch",
  },
  datePicker: { width: "100%", maxWidth: "100%" },
  stepper: {
    backgroundColor: theme.colors.elevated,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginTop: theme.spacing.sm,
  },
  stepperLabel: { color: theme.colors.textSecondary, marginBottom: 10 },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: {
    width: 52,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: "700" },
  stepValue: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "700" },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
});
