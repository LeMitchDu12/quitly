import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import OnboardingHeader from "../../components/OnboardingHeader";
import { theme } from "../../theme";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/Root";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.logo}>Quitly</Text>
        <Text style={styles.title}>Reclaim your freedom.</Text>
        <Text style={styles.subtitle}>Every smoke-free day counts.</Text>
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryButton title="Get Started" onPress={() => navigation.navigate("QuitDate")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: theme.spacing.lg, alignItems: "center" },
  logo: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: "900", marginBottom: 18 },
  title: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: "800", textAlign: "center" },
  subtitle: { color: theme.colors.textSecondary, marginTop: 10, textAlign: "center" },
});
