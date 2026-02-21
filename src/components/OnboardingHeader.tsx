import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";

export default function OnboardingHeader({
  step,
  total,
  onBack,
  hideBack = false,
}: {
  step: number;          // 1..total
  total: number;         // ex: 5
  onBack?: () => void;
  hideBack?: boolean;
}) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(1, step / total)) * 100;

  return (
    <View style={styles.wrap}>
      {hideBack ? (
        <View style={styles.backSpacer} />
      ) : (
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.stepText}>{t("onboardingStepProgress", { step, total })}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>

      {/* symétrie visuelle */}
      <View style={styles.backSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  backText: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: "900", marginTop: -2 },
  backSpacer: { width: 40, height: 40 },

  stepText: { color: theme.colors.textTertiary, fontWeight: "800", marginBottom: 8, fontSize: 12 },
  track: { height: 6, borderRadius: 999, backgroundColor: theme.colors.divider, overflow: "hidden" },
  fill: { height: 6, borderRadius: 999, backgroundColor: theme.colors.primary },
});
