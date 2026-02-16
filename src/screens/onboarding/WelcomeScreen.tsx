import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import { theme } from "../../theme";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/Root";
import { useTranslation } from "react-i18next";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.center}>
          <Text style={styles.logo}>{t("appName")}</Text>
          <Text style={styles.title}>Reclaim your freedom.</Text>
          <Text style={styles.subtitle}>Every smoke-free day counts.</Text>
        </View>

        <PrimaryButton title="Get Started" onPress={() => navigation.navigate("QuitDate")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "space-between", paddingBottom: theme.spacing.lg },
  center: { marginTop: theme.spacing.xl, alignItems: "center" },
  logo: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: "800", marginBottom: 16 },
  title: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: "700", textAlign: "center" },
  subtitle: { color: theme.colors.textSecondary, marginTop: 10, textAlign: "center" },
});
