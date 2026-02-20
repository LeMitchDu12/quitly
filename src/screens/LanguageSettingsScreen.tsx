import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import { theme } from "../theme";
import { setLanguagePreference } from "../localization/appLanguage";
import {
  LanguagePref,
  getDeviceLocale,
  readLanguagePreference,
  resolveLanguage,
} from "../localization/preferences";

function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.option, pressed && styles.optionPressed]} onPress={onPress}>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={[styles.optionCheck, selected && styles.optionCheckSelected]}>{selected ? "●" : "○"}</Text>
    </Pressable>
  );
}

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [preference, setPreference] = useState<LanguagePref>(() => readLanguagePreference());

  const refresh = useCallback(() => {
    setPreference(readLanguagePreference());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const autoResolvedLanguage = useMemo(() => resolveLanguage("auto", getDeviceLocale()), []);
  const autoResolvedLabel = autoResolvedLanguage === "fr" ? t("languageFrench") : t("languageEnglish");

  const onSelect = async (next: LanguagePref) => {
    setPreference(next);
    await setLanguagePreference(next);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.closeText}>{t("close")}</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>{t("settingsLanguage")}</Text>
        <View style={styles.block}>
          <OptionRow
            title={t("settingsAutoRecommended")}
            subtitle={t("settingsAutoResolvedLanguage", { value: autoResolvedLabel })}
            selected={preference === "auto"}
            onPress={() => onSelect("auto")}
          />
          <OptionRow
            title={t("languageFrench")}
            selected={preference === "fr"}
            onPress={() => onSelect("fr")}
          />
          <OptionRow
            title={t("languageEnglish")}
            selected={preference === "en"}
            onPress={() => onSelect("en")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xl,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "900",
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  topRow: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeText: {
    color: theme.colors.textSecondary,
    fontWeight: "800",
    fontSize: 13,
  },
  block: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  option: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionPressed: {
    backgroundColor: theme.colors.elevated,
  },
  optionCopy: {
    flex: 1,
    paddingRight: 10,
  },
  optionTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 15,
  },
  optionSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: 3,
    fontSize: 12,
  },
  optionCheck: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: "800",
  },
  optionCheckSelected: {
    color: theme.colors.primary,
  },
});
