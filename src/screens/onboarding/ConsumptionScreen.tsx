import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Screen from "../../components/Screen";
import PrimaryButton from "../../components/PrimaryButton";
import { theme } from "../../theme";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/Root";
import { StorageKeys } from "../../storage/keys";
import { getNumber, setNumber } from "../../storage/mmkv";

type Props = NativeStackScreenProps<RootStackParamList, "Consumption">;

function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>

      <View style={styles.stepperRow}>
        <Pressable
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={styles.stepBtnText}>–</Text>
        </Pressable>

        <Text style={styles.stepValue}>
          {value} {suffix ?? ""}
        </Text>

        <Pressable
          style={styles.stepBtn}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ConsumptionScreen({ navigation }: Props) {
  const [cigsPerDay, setCigsPerDay] = useState(getNumber(StorageKeys.cigsPerDay) ?? 12);
  const [pricePerPack, setPricePerPack] = useState(getNumber(StorageKeys.pricePerPack) ?? 12);
  const [cigsPerPack, setCigsPerPack] = useState(getNumber(StorageKeys.cigsPerPack) ?? 20);

  const canContinue = useMemo(() => cigsPerPack > 0 && pricePerPack >= 0 && cigsPerDay >= 0, [
    cigsPerPack,
    pricePerPack,
    cigsPerDay,
  ]);

  const saveAndNext = () => {
    setNumber(StorageKeys.cigsPerDay, cigsPerDay);
    setNumber(StorageKeys.pricePerPack, pricePerPack);
    setNumber(StorageKeys.cigsPerPack, cigsPerPack);
    navigation.navigate("Projection");
  };

  return (
    <Screen>
      <Text style={styles.title}>Your baseline</Text>
      <Text style={styles.subtitle}>This helps calculate savings & progress.</Text>

      <View style={{ height: theme.spacing.md }} />

      <Stepper label="Cigarettes per day" value={cigsPerDay} onChange={setCigsPerDay} min={0} max={80} />
      <Stepper label="Price per pack" value={pricePerPack} onChange={setPricePerPack} min={0} max={50} suffix="€" />
      <Stepper label="Cigarettes per pack" value={cigsPerPack} onChange={setCigsPerPack} min={1} max={40} />

      <View style={{ flex: 1 }} />

      <PrimaryButton title="Continue" onPress={saveAndNext} disabled={!canContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.textPrimary, fontSize: theme.typography.h2.fontSize, fontWeight: "700" },
  subtitle: { color: theme.colors.textSecondary, marginTop: 8 },

  stepper: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: theme.spacing.sm,
  },
  stepperLabel: { color: theme.colors.textSecondary, marginBottom: 10 },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: {
    width: 52,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: "700" },
  stepValue: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "700" },
});
