import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../../navigation/Root";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import OnboardingHeader from "../../components/OnboardingHeader";
import { theme } from "../../theme";
import { StorageKeys } from "../../storage/keys";
import { getNumber, setString } from "../../storage/mmkv";
import { moneySaved } from "../../utils/calculations";
import { formatMoney } from "../../localization/money";
import { toLocalISODate } from "../../utils/date";
import { readResolvedLanguage } from "../../localization/preferences";

type Props = NativeStackScreenProps<RootStackParamList, "QuitDate">;

function toISODate(d: Date) {
  return toLocalISODate(d);
}

function clampToToday(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return x > today ? today : x;
}

function addDays(base: Date, delta: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

export default function QuitDateScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const resolvedLanguage = readResolvedLanguage() ?? (i18n.resolvedLanguage?.startsWith("fr") ? "fr" : "en");
  const dateLocale = resolvedLanguage === "fr" ? "fr-FR" : "en-US";

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [date, setDate] = useState<Date>(today);
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");
  const continueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pretty = useMemo(() => {
    return date.toLocaleDateString(dateLocale, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [date, dateLocale]);

  const isToday = useMemo(() => toISODate(date) === toISODate(today), [date, today]);
  const isYesterday = useMemo(() => toISODate(date) === toISODate(addDays(today, -1)), [date, today]);

  const cigsPerDay = getNumber(StorageKeys.cigsPerDay) ?? 12;
  const pricePerPack = getNumber(StorageKeys.pricePerPack) ?? 12;
  const cigsPerPack = getNumber(StorageKeys.cigsPerPack) ?? 20;

  const preview7 = useMemo(() => {
    const saved = moneySaved(7, cigsPerDay, cigsPerPack, pricePerPack);
    return formatMoney(saved);
  }, [cigsPerDay, cigsPerPack, pricePerPack]);

  const onChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (!selected) return;
    setDate(clampToToday(selected));
  };

  React.useEffect(() => {
    return () => {
      if (continueTimerRef.current) {
        clearTimeout(continueTimerRef.current);
      }
    };
  }, []);

  const saveAndContinue = () => {
    setString(StorageKeys.quitDate, toISODate(date));
    if (Platform.OS !== "ios") {
      navigation.navigate("Consumption");
      return;
    }
    // Close iOS date picker first to avoid later native picker crashes on Settings notification flow.
    setShowPicker(false);
    if (continueTimerRef.current) {
      clearTimeout(continueTimerRef.current);
    }
    continueTimerRef.current = setTimeout(() => {
      navigation.navigate("Consumption");
      continueTimerRef.current = null;
    }, 120);
  };

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <OnboardingHeader step={1} total={4} hideBack />

        <Text style={styles.title}>{t("onboardingQuitDateTitle")}</Text>
        <Text style={styles.subtitle}>{t("onboardingQuitDateSubtitle")}</Text>

        <View style={styles.quickRow}>
          <Pressable
            onPress={() => setDate(today)}
            style={({ pressed }) => [
              styles.quickChip,
              isToday && styles.quickChipActive,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.quickText, isToday && styles.quickTextActive]}>{t("onboardingToday")}</Text>
          </Pressable>

          <Pressable
            onPress={() => setDate(addDays(today, -1))}
            style={({ pressed }) => [
              styles.quickChip,
              isYesterday && styles.quickChipActive,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.quickText, isYesterday && styles.quickTextActive]}>{t("onboardingYesterday")}</Text>
          </Pressable>

          {Platform.OS === "android" && (
            <Pressable
              onPress={() => setShowPicker(true)}
              style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.quickText}>{t("onboardingPickDate")}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.dateCard}>
          <Text style={styles.dateLabel}>{t("settingsSelectedDate")}</Text>
          <Text style={styles.dateBig}>{pretty}</Text>
          <Text style={styles.helper}>
            {Platform.OS === "ios" ? t("settingsDateHelperIOS") : t("settingsDateHelperAndroid")}
          </Text>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>{t("onboardingPreviewTitle")}</Text>
          <Text style={styles.previewValue}>{preview7}</Text>
          <Text style={styles.previewHint}>{t("onboardingPreviewHint")}</Text>
        </View>

        {showPicker && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={date}
              mode="date"
              maximumDate={today}
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={onChange}
              locale={dateLocale}
              themeVariant="dark"
              style={styles.datePicker}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.ctaBar}>
        <PrimaryButton title={t("continue")} onPress={saveAndContinue} />
        <Text style={styles.footer}>{t("onboardingFooter")}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: "900", marginTop: 10 },
  subtitle: { color: theme.colors.textSecondary, marginTop: 10, marginBottom: 16, lineHeight: 18 },

  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  quickChip: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: "transparent",
  },
  quickChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
  quickText: { color: theme.colors.textPrimary, fontWeight: "800", fontSize: 13 },
  quickTextActive: { color: theme.colors.primary },

  dateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 12,
  },
  dateLabel: { color: theme.colors.textTertiary, marginBottom: 8, fontWeight: "700" },
  dateBig: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: "900" },
  helper: { color: theme.colors.textTertiary, marginTop: 10, fontSize: 12 },

  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 14,
  },
  previewTitle: { color: theme.colors.textSecondary, fontWeight: "800" },
  previewValue: { color: theme.colors.primary, fontSize: 22, fontWeight: "900", marginTop: 8 },
  previewHint: { color: theme.colors.textTertiary, marginTop: 6, fontSize: 12 },

  pickerWrap: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: "hidden",
    alignItems: "stretch",
  },
  datePicker: { width: "100%", maxWidth: "100%" },

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
  footer: { color: theme.colors.textTertiary, textAlign: "center", marginTop: 10, fontSize: 12 },
});
