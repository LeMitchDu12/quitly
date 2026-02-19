import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import SecondaryButton from "../components/SecondaryButton";
import PaywallModal from "../components/PaywallModal";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/Root";
import { StorageKeys } from "../storage/keys";
import { getBool, setBool } from "../storage/mmkv";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RelapseSupportScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const isPremium = getBool(StorageKeys.isPremium) ?? false;

  const params = route.params as RootStackParamList["RelapseSupport"];
  const savedAmountLabel = useMemo(() => params?.savedAmountLabel ?? "0 EUR", [params?.savedAmountLabel]);

  const onAddNote = () => {
    if (!isPremium) {
      setPaywallOpen(true);
      return;
    }
    navigation.replace("JournalCreate", { linkedToRelapse: true });
  };

  const unlockPremium = () => {
    setBool(StorageKeys.isPremium, true);
    setPaywallOpen(false);
    navigation.replace("JournalCreate", { linkedToRelapse: true });
  };

  return (
    <Screen>
      <View style={styles.root}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.close}>{t("close")}</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.title}>{t("relapseContinueTitle")}</Text>
          <Text style={styles.subtitle}>{t("relapseContinueBody")}</Text>
          <View style={{ marginTop: 12 }}>
            <SecondaryButton title={t("journalAddNote")} onPress={onAddNote} />
          </View>
        </View>
      </View>

      <PaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlock={unlockPremium}
        savedAmountLabel={savedAmountLabel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  close: { color: theme.colors.textSecondary, fontSize: 14 },
  card: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    padding: 16,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
