import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Alert, Linking } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import { theme } from "../../theme";
import { RootStackParamList } from "../../navigation/Root";
import { StorageKeys } from "../../storage/keys";
import { getBool, setBool } from "../../storage/mmkv";
import { setOnboardingComplete } from "../../storage/profile";
import { requestNotifPermissions, scheduleMotivationReminders } from "../../notifications";
import { readNotificationPlan } from "../../storage/notificationTimes";
import OnboardingHeader from "../../components/OnboardingHeader";
import { initPurchases, isPremium as hasPremiumEntitlement, restore as restorePurchases } from "../../purchases";

type Props = NativeStackScreenProps<RootStackParamList, "Paywall">;
type Plan = "annual" | "monthly";

function PriceCard({
  title,
  subtitle,
  badge,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.priceCard,
        selected ? styles.priceSelected : styles.priceUnselected,
        pressed && { opacity: 0.95, transform: [{ scale: 0.995 }] },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.priceTitle}>{title}</Text>
        <Text style={styles.priceSub}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function PaywallScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [busy, setBusy] = useState(false);
  const [localPremium, setLocalPremium] = useState<boolean>(() => getBool(StorageKeys.isPremium) ?? false);
  const [purchasesUnavailable, setPurchasesUnavailable] = useState(false);

  useEffect(() => {
    initPurchases()
      .then((ready) => setPurchasesUnavailable(!ready))
      .catch(() => {
        setPurchasesUnavailable(true);
      });
  }, []);

  const finishAndGoApp = () => {
    navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
  };

  const enableNotificationsIfAllowed = async () => {
    try {
      const ok = await requestNotifPermissions();
      if (ok) {
        await scheduleMotivationReminders(readNotificationPlan());
      }
    } catch {
      // Do not block onboarding if notifications fail.
    }
  };

  const continueFree = async () => {
    setBusy(true);
    try {
      await setOnboardingComplete();
      await enableNotificationsIfAllowed();
      finishAndGoApp();
    } finally {
      setBusy(false);
    }
  };

  const unlockPremiumMVP = async () => {
    setBusy(true);
    try {
      setBool(StorageKeys.isPremium, true);
      setLocalPremium(true);
      await setOnboardingComplete();
      await enableNotificationsIfAllowed();
      finishAndGoApp();
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    if (purchasesUnavailable) {
      Alert.alert(t("restore"), t("purchasesUnavailableExpoGo"));
      return;
    }

    setBusy(true);
    try {
      const info = await restorePurchases();
      const premium = hasPremiumEntitlement(info);
      setBool(StorageKeys.isPremium, premium);
      setLocalPremium(premium);
      if (premium) {
        Alert.alert("Success", "Premium restored.");
      } else {
        Alert.alert("No active subscription", "No active premium subscription was found.");
      }
    } catch {
      Alert.alert("Error", t("settingsRestoreFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onManageSubscription = async () => {
    const url = "https://apps.apple.com/account/subscriptions";
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Error", "Unable to open subscription settings.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Unable to open subscription settings.");
    }
  };

  const primaryCtaTitle = localPremium ? t("paywallPremiumEnabled") : t("unlock");

  return (
    <Screen>
      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 190 }}
      >
        {/* ✅ Mets 5/5 si ton onboarding est en 5 étapes */}
        <OnboardingHeader step={4} total={4} onBack={() => navigation.goBack()} />

        <View style={styles.header}>
          <Text style={styles.title}>{t("paywallTitle")}</Text>
          <Text style={styles.subtitle}>{t("paywallOnboardingSubtitle")}</Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.li}>- {t("featCharts")}</Text>
          <Text style={styles.li}>- {t("featTimeline")}</Text>
          <Text style={styles.li}>- {t("featUnlimited")}</Text>
          <Text style={styles.li}>- {t("featUpdates")}</Text>
        </View>

        <View style={{ height: theme.spacing.md }} />

        <PriceCard
          title={t("paywallPlanAnnualTitle")}
          subtitle={t("paywallPlanAnnualSubtitle")}
          badge={t("paywallBestValue")}
          selected={selectedPlan === "annual"}
          onPress={() => setSelectedPlan("annual")}
        />

        <PriceCard
          title={t("paywallPlanMonthlyTitle")}
          subtitle={t("paywallPlanMonthlySubtitle")}
          selected={selectedPlan === "monthly"}
          onPress={() => setSelectedPlan("monthly")}
        />

        {/* Petit espace de respiration */}
        <View style={{ height: theme.spacing.md }} />

        {/* Optionnel : petite phrase premium sous les plans */}
        <Text style={styles.note}>{t("paywallNote") ?? "Best value: Annual plan."}</Text>
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={styles.ctaBar}>
        {busy ? (
          <View style={styles.busyInline}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <PrimaryButton title={primaryCtaTitle} onPress={unlockPremiumMVP} disabled={localPremium} />

            <View style={{ height: theme.spacing.sm }} />

            <Pressable onPress={continueFree} style={({ pressed }) => [styles.linkWrap, pressed && { opacity: 0.85 }]}>
              <Text style={styles.link}>{t("paywallContinueFree")}</Text>
            </Pressable>

            <View style={{ height: theme.spacing.sm }} />

            <Pressable onPress={onRestore} style={({ pressed }) => [styles.restoreWrap, pressed && { opacity: 0.85 }]}>
              <Text style={styles.restore}>{t("restore")}</Text>
            </Pressable>

            <View style={{ height: 6 }} />

            <Pressable onPress={onManageSubscription} style={({ pressed }) => [styles.restoreWrap, pressed && { opacity: 0.85 }]}>
              <Text style={styles.restore}>{t("manageSubscription")}</Text>
            </Pressable>

            {purchasesUnavailable ? (
              <Text style={styles.unavailableHint}>{t("purchasesUnavailableExpoGo")}</Text>
            ) : null}

            <Text style={styles.legal}>
              Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Payment will be charged to your Apple ID account.
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: theme.spacing.sm },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "900",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: 10,
  },

  features: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  li: {
    color: theme.colors.textPrimary,
    marginBottom: 10,
    fontSize: theme.typography.body.fontSize,
  },

  priceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceSelected: { borderWidth: 1, borderColor: theme.colors.primary },
  priceUnselected: { borderWidth: 1, borderColor: theme.colors.divider },

  priceTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "900" },
  priceSub: { color: theme.colors.textSecondary, marginTop: 6 },

  badge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  badgeText: { color: theme.colors.primary, fontWeight: "900", fontSize: 12 },

  note: {
    color: theme.colors.textTertiary,
    textAlign: "center",
    fontSize: 12,
    marginTop: 6,
  },

  // CTA bar fixed
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

  busyInline: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },

  linkWrap: { alignItems: "center" },
  link: { color: theme.colors.textSecondary, textDecorationLine: "underline", fontWeight: "700" },

  restoreWrap: { alignItems: "center" },
  restore: { color: theme.colors.textTertiary, textDecorationLine: "underline" },
  unavailableHint: {
    color: theme.colors.textTertiary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },

  legal: {
    color: theme.colors.textTertiary,
    fontSize: 12,
    marginTop: 14,
    textAlign: "center",
    lineHeight: 16,
  },
});
