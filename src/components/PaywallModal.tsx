import React from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { theme } from "../theme";
import PrimaryButton from "./PrimaryButton";
import { useTranslation } from "react-i18next";

export default function PaywallModal({
  visible,
  onClose,
  onUnlock,
  savedAmountLabel,
}: {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
  savedAmountLabel: string;
}) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("paywallTitle")}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t("close")}</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>{t("paywallSubtitle", { amount: savedAmountLabel })}</Text>

          <View style={styles.list}>
            <Text style={styles.li}>✔ {t("featCharts")}</Text>
            <Text style={styles.li}>✔ {t("featTimeline")}</Text>
            <Text style={styles.li}>✔ {t("featUnlimited")}</Text>
            <Text style={styles.li}>✔ {t("featUpdates")}</Text>
          </View>

          <View style={{ height: 16 }} />
          <PrimaryButton title={t("unlock")} onPress={onUnlock} />
          <Text style={styles.legal}>
            Auto-renewable subscription. Cancel anytime in Apple settings.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
    borderColor: theme.colors.divider,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: theme.colors.textPrimary, fontSize: theme.typography.h2.fontSize, fontWeight: "700" },
  close: { color: theme.colors.textSecondary, fontSize: theme.typography.body.fontSize },
  subtitle: { color: theme.colors.textSecondary, marginTop: 10, marginBottom: 18 },
  list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16 },
  li: { color: theme.colors.textPrimary, marginBottom: 10, fontSize: theme.typography.body.fontSize },
  legal: { color: theme.colors.textTertiary, fontSize: theme.typography.small.fontSize, marginTop: 12 },
});
