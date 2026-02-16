import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import { theme } from "../../theme";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/Root";
import { StorageKeys } from "../../storage/keys";
import { getString, setString } from "../../storage/mmkv";

type Props = NativeStackScreenProps<RootStackParamList, "QuitDate">;

// MVP sans DatePicker natif pour rester 100% copiable.
// Tu peux remplacer par @react-native-community/datetimepicker plus tard.
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function QuitDateScreen({ navigation }: Props) {
  const [quitDate, setQuitDate] = useState(getString(StorageKeys.quitDate) ?? todayISO());

  const saveAndNext = () => {
    setString(StorageKeys.quitDate, quitDate);
    navigation.navigate("Consumption");
  };

  return (
    <Screen>
      <Text style={styles.title}>When did you quit?</Text>
      <Text style={styles.subtitle}>Pick your start date.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Quit date (YYYY-MM-DD)</Text>

        <Pressable
          style={styles.input}
          onPress={() => {
            // Simple: toggle between today and yesterday for MVP.
            // Remplace par DatePicker ensuite.
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const yesterday = d.toISOString().slice(0, 10);
            setQuitDate((prev) => (prev === todayISO() ? yesterday : todayISO()));
          }}
        >
          <Text style={styles.value}>{quitDate}</Text>
          <Text style={styles.hint}>
            {Platform.OS === "ios" ? "Tap to toggle (MVP)" : "Tap to toggle (MVP)"}
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <SecondaryButton title="Start today" onPress={() => setQuitDate(todayISO())} />
      <View style={{ height: theme.spacing.sm }} />
      <PrimaryButton title="Continue" onPress={saveAndNext} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.textPrimary, fontSize: theme.typography.h2.fontSize, fontWeight: "700" },
  subtitle: { color: theme.colors.textSecondary, marginTop: 8 },
  card: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  label: { color: theme.colors.textSecondary, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    padding: 14,
  },
  value: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "700" },
  hint: { color: theme.colors.textTertiary, marginTop: 6, fontSize: 12 },
});
