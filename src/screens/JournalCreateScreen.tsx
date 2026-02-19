import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import PaywallModal from "../components/PaywallModal";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/Root";
import type { JournalMood } from "../journal/journalTypes";
import { createJournalEntry } from "../journal/journalStorage";
import { StorageKeys } from "../storage/keys";
import { getBool, setBool } from "../storage/mmkv";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MOODS: JournalMood[] = ["stable", "stress", "craving", "proud"];

export default function JournalCreateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { t } = useTranslation();
  const params = route.params as RootStackParamList["JournalCreate"];
  const [mood, setMood] = useState<JournalMood | undefined>();
  const [text, setText] = useState("");
  const [isPremium, setIsPremium] = useState<boolean>(getBool(StorageKeys.isPremium) ?? false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const linkedToShield = params?.linkedToShield === true;
  const linkedToRelapse = params?.linkedToRelapse === true;

  const canSave = useMemo(() => text.trim().length > 0, [text]);

  const onSave = () => {
    if (!canSave) return;
    const entry = createJournalEntry({
      mood,
      linkedToShield,
      linkedToRelapse,
      text,
    });
    navigation.replace("JournalDetail", { entryId: entry.id });
  };

  const unlockPremium = () => {
    setBool(StorageKeys.isPremium, true);
    setIsPremium(true);
    setPaywallOpen(false);
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Text style={styles.back}>{t("close")}</Text>
            </Pressable>
            <Text style={styles.title}>{t("journalTitle")}</Text>
            <View style={styles.topSpacer} />
          </View>

          {!isPremium ? (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedTitle}>{t("journalPremiumTitle")}</Text>
              <Text style={styles.lockedText}>{t("journalPremiumBody")}</Text>
              <View style={{ marginTop: 12 }}>
                <SecondaryButton title={t("shieldPaywallCtaUnlock")} onPress={() => setPaywallOpen(true)} />
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.dateLabel}>
                {new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date())}
              </Text>

              <View style={styles.badgesRow}>
                {linkedToShield ? <Text style={styles.badge}>🔥 {t("journalLinkedShield")}</Text> : null}
                {linkedToRelapse ? <Text style={styles.badge}>🔁 {t("journalLinkedRelapse")}</Text> : null}
              </View>

              <Text style={styles.sectionTitle}>{t("journalMoodLabel")}</Text>
              <View style={styles.moodWrap}>
                {MOODS.map((option) => {
                  const selected = mood === option;
                  return (
                    <Pressable
                      key={option}
                      style={[styles.moodChip, selected && styles.moodChipActive]}
                      onPress={() => setMood((current) => (current === option ? undefined : option))}
                    >
                      <Text style={[styles.moodText, selected && styles.moodTextActive]}>{t(`journalMood.${option}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={styles.input}
                multiline
                scrollEnabled={false}
                value={text}
                onChangeText={setText}
                placeholder={t("journalPlaceholder")}
                placeholderTextColor={theme.colors.textTertiary}
                textAlignVertical="top"
              />

              <PrimaryButton title={t("journalSave")} onPress={onSave} disabled={!canSave} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <PaywallModal visible={paywallOpen} onClose={() => setPaywallOpen(false)} onUnlock={unlockPremium} savedAmountLabel="0 EUR" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: theme.spacing.xl },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  back: { color: theme.colors.textSecondary, fontSize: 14 },
  title: { color: theme.colors.textPrimary, fontWeight: "800", fontSize: 18 },
  topSpacer: { width: 36 },
  dateLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: theme.spacing.xs,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  badge: {
    color: theme.colors.textSecondary,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  moodWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  moodChip: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  moodChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(74,222,128,0.10)",
  },
  moodText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  moodTextActive: {
    color: theme.colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: theme.spacing.sm,
    minHeight: 180,
    fontSize: 16,
    lineHeight: 22,
  },
  lockedCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    padding: 16,
  },
  lockedTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  lockedText: {
    color: theme.colors.textSecondary,
    marginTop: 6,
    lineHeight: 21,
  },
});
