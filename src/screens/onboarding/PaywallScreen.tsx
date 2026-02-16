import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import { theme } from "../../theme";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/Root";
import { StorageKeys } from "../../storage/keys";
import { getBool, setBool } from "../../storage/mmkv";
import { setOnboardingComplete } from "../../storage/profile";

// ✅ Notifications (optionnel)
// Si tu n'as pas encore créé src/notifications/index.ts, commente ces 2 lignes.
import { requestNotifPermissions, scheduleDailyMotivation } from "../../notifications";

// ✅ RevenueCat (optionnel)
// Si tu n'as pas encore créé src/purchases/index.ts, commente ces 2 lignes.
// IMPORTANT: RevenueCat nécessite EAS build / Dev Client (pas Expo Go standard).
// import { initPurchases, getOfferingPackages, purchase, restore, isPremium as isPremiumRC } from "../../purchases";
// import type { PurchasesPackage } from "react-native-purchases";

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
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [busy, setBusy] = useState(false);

  // MVP local premium (MMKV)
  const [localPremium, setLocalPremium] = useState<boolean>(() => getBool(StorageKeys.isPremium) ?? false);

  // RevenueCat placeholders (optional)
  // const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  // const selectedPackage = useMemo(() => {
  //   if (!packages.length) return null;
  //   // mapping simple: annual -> first annual package if exists, else first
  //   const byId = (p: PurchasesPackage) => p.identifier?.toLowerCase() ?? "";
  //   const annual = packages.find((p) => byId(p).includes("annual")) ?? packages[0];
  //   const monthly = packages.find((p) => byId(p).includes("monthly")) ?? packages[0];
  //   return selectedPlan === "annual" ? annual : monthly;
  // }, [packages, selectedPlan]);

  // Optionnel : init RevenueCat ici (EAS only)
  useEffect(() => {
    // (async () => {
    //   try {
    //     if (Platform.OS === "ios") {
    //       await initPurchases();
    //       const pkgs = await getOfferingPackages();
    //       setPackages(pkgs);
    //     }
    //   } catch {
    //     // ignore in dev
    //   }
    // })();
  }, []);

  const finishAndGoApp = () => {
    navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
  };

  const enableNotificationsIfAllowed = async () => {
    try {
      const ok = await requestNotifPermissions();
      if (ok) {
        await scheduleDailyMotivation();
      }
    } catch {
      // ne bloque jamais l’onboarding si notifications échouent
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

  // ✅ MVP: Unlock Premium en local (MMKV)
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

  // ✅ RevenueCat (optionnel) — à activer quand tu passes EAS
  // const unlockPremiumRevenueCat = async () => {
  //   if (!selectedPackage) {
  //     // fallback MVP
  //     return unlockPremiumMVP();
  //   }
  //   setBusy(true);
  //   try {
  //     const info = await purchase(selectedPackage);
  //     if (isPremiumRC(info)) {
  //       setBool(StorageKeys.isPremium, true);
  //       setLocalPremium(true);
  //     }
  //     await setOnboardingComplete();
  //     await enableNotificationsIfAllowed();
  //     finishAndGoApp();
  //   } finally {
  //     setBusy(false);
  //   }
  // };

  // ✅ Restore purchases (MVP: noop / RevenueCat: restore)
  const onRestore = async () => {
    setBusy(true);
    try {
      // RevenueCat:
      // const info = await restore();
      // if (isPremiumRC(info)) {
      //   setBool(StorageKeys.isPremium, true);
      //   setLocalPremium(true);
      // }

      // MVP: rien à restaurer, mais on garde le bouton
    } finally {
      setBusy(false);
    }
  };

  const primaryCtaTitle = localPremium ? "Premium enabled ✓" : "Unlock Full Access";

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Keep your freedom going.</Text>
        <Text style={styles.subtitle}>Unlock deeper insights and stay motivated.</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <Text style={styles.li}>✔ Advanced progress charts</Text>
        <Text style={styles.li}>✔ Full health timeline</Text>
        <Text style={styles.li}>✔ Unlimited history</Text>
        <Text style={styles.li}>✔ Future updates included</Text>
      </View>

      {/* Plans */}
      <View style={{ height: theme.spacing.md }} />

      <PriceCard
        title="€29.99 / year"
        subtitle="≈ €2.50 / month"
        badge="Best Value"
        selected={selectedPlan === "annual"}
        onPress={() => setSelectedPlan("annual")}
      />

      <PriceCard
        title="€4.99 / month"
        subtitle="Cancel anytime"
        selected={selectedPlan === "monthly"}
        onPress={() => setSelectedPlan("monthly")}
      />

      {/* CTA */}
      <View style={{ flex: 1 }} />

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <PrimaryButton
            title={primaryCtaTitle}
            onPress={unlockPremiumMVP /* remplace par unlockPremiumRevenueCat quand prêt */}
            disabled={localPremium}
          />

          <View style={{ height: theme.spacing.sm }} />

          <Pressable onPress={continueFree} style={({ pressed }) => [styles.linkWrap, pressed && { opacity: 0.85 }]}>
            <Text style={styles.link}>Continue with free version</Text>
          </Pressable>

          <View style={{ height: theme.spacing.sm }} />

          <Pressable onPress={onRestore} style={({ pressed }) => [styles.restoreWrap, pressed && { opacity: 0.85 }]}>
            <Text style={styles.restore}>Restore purchases</Text>
          </Pressable>

          <Text style={styles.legal}>
            Auto-renewable subscription. Cancel anytime in Apple settings.{"\n"}
            By continuing, you agree to Terms and Privacy Policy.
          </Text>
        </>
      )}
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
  priceSelected: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  priceUnselected: {
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  priceTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  priceSub: {
    color: theme.colors.textSecondary,
    marginTop: 6,
  },

  badge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  badgeText: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 12,
  },

  busy: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },

  linkWrap: { alignItems: "center" },
  link: { color: theme.colors.textSecondary, textDecorationLine: "underline", fontWeight: "700" },

  restoreWrap: { alignItems: "center" },
  restore: { color: theme.colors.textTertiary, textDecorationLine: "underline" },

  legal: {
    color: theme.colors.textTertiary,
    fontSize: 12,
    marginTop: 14,
    textAlign: "center",
    lineHeight: 16,
  },
});
