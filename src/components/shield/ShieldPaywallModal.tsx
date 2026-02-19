import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "../../theme";
import PrimaryButton from "../PrimaryButton";
import SecondaryButton from "../SecondaryButton";

export default function ShieldPaywallModal({
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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t("shieldPaywallTitle")}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>{t("close")}</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>{t("shieldPaywallSubtitle", { moneySaved: savedAmountLabel })}</Text>

          <View style={styles.list}>
            <Text style={styles.li}>• {t("shieldPaywallBulletUnlimited")}</Text>
            <Text style={styles.li}>• {t("shieldPaywallBulletHistory")}</Text>
            <Text style={styles.li}>• {t("shieldPaywallBulletRiskHours")}</Text>
            <Text style={styles.li}>• {t("shieldPaywallBulletUpdates")}</Text>
          </View>

          <View style={{ height: theme.spacing.sm }} />
          <PrimaryButton title={t("shieldPaywallCtaUnlock")} onPress={onUnlock} />
          <View style={{ height: theme.spacing.xs }} />
          <SecondaryButton title={t("shieldPaywallCtaLater")} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: theme.spacing.md,
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: theme.colors.textPrimary,
    fontWeight: "900",
    fontSize: 22,
  },
  close: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
  },
  list: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 12,
    gap: 8,
  },
  li: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
});
