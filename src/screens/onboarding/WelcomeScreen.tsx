import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import { theme } from "../../theme";
import { RootStackParamList } from "../../navigation/Root";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={styles.center}>
        <Image source={require("../../../assets/quitly_2.png")} style={styles.logoImage} resizeMode="cover" />
        <Text style={styles.logoText}>{t("appName")}</Text>
        <Text style={styles.title}>{t("welcomeTitle")}</Text>
        <Text style={styles.subtitle}>{t("welcomeSubtitle")}</Text>
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryButton title={t("getStarted")} onPress={() => navigation.navigate("QuitDate")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: theme.spacing.lg, alignItems: "center" },
  logoImage: {
    width: 176,
    height: 176,
    borderRadius: 40,
    marginBottom: 18,
  },
  logoText: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: "900", marginBottom: 12 },
  title: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: "800", textAlign: "center" },
  subtitle: { color: theme.colors.textSecondary, marginTop: 10, textAlign: "center" },
});
