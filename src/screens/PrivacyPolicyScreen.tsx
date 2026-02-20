import React from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../components/Screen";
import { theme } from "../theme";
import type { RootStackParamList } from "../navigation/Root";

const PRIVACY_TEXT_EN = `Title: Quitly Privacy Policy
Last updated: [DATE]

Quitly is developed by:
[DEVELOPER_FULL_NAME]
[LEGAL_ENTITY_NAME]
[EMAIL_ADDRESS]

1. Data Collection
Quitly does not collect, store, or share any personal data.
All information you enter in the app (smoking habits, progress, savings) is stored locally on your device using secure local storage.

2. No Cloud Storage
Quitly does not use servers.
No user data is transmitted externally.

3. Payments
Subscriptions are handled securely by Apple via the App Store.
Quitly does not access or store payment information.

4. Contact
For support inquiries, contact:
[EMAIL_ADDRESS]`;

const PRIVACY_TEXT_FR = `Titre : Politique de confidentialité Quitly
Dernière mise à jour : [DATE]

Quitly est développé par :
[DEVELOPER_FULL_NAME]
[LEGAL_ENTITY_NAME]
[EMAIL_ADDRESS]

1. Collecte des données
Quitly ne collecte, ne stocke, ni ne partage aucune donnée personnelle.
Toutes les informations que vous saisissez dans l’application (habitudes tabac, progression, économies) sont stockées localement sur votre appareil via un stockage local sécurisé.

2. Pas de stockage cloud
Quitly n’utilise pas de serveurs.
Aucune donnée utilisateur n’est transmise à des services externes.

3. Paiements
Les abonnements sont gérés de façon sécurisée par Apple via l’App Store.
Quitly n’accède pas et ne stocke pas les informations de paiement.

4. Contact
Pour toute demande d’assistance, contactez :
[EMAIL_ADDRESS]`;

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t, i18n } = useTranslation();
  const isFrench = i18n.language?.toLowerCase().startsWith("fr");
  const privacyText = isFrench ? PRIVACY_TEXT_FR : PRIVACY_TEXT_EN;

  const openSupport = async () => {
    const url = "mailto:[EMAIL_ADDRESS]";
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(t("settingsNotifErrorTitle"), t("privacyEmailOpenError"));
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("settingsNotifErrorTitle"), t("privacyEmailOpenError"));
    }
  };

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.sideSlot}>
            <Text style={styles.back}>{t("close")}</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {t("settingsPrivacyPolicy")}
          </Text>
          <View style={styles.sideSlot} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.body}>{privacyText}</Text>
          <Pressable onPress={openSupport} style={styles.cta}>
            <Text style={styles.ctaText}>{t("privacyContactSupport")}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sideSlot: {
    width: 64,
  },
  back: { color: theme.colors.textSecondary, fontSize: 14 },
  title: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 17,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scrollContent: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outline,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 16,
    paddingBottom: 24,
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  cta: {
    marginTop: theme.spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.45)",
    backgroundColor: "rgba(74,222,128,0.12)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  ctaText: {
    color: theme.colors.primary,
    fontWeight: "800",
    fontSize: 13,
  },
});
