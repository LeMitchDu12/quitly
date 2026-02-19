import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";

export default function MonthPickerPill({
  label,
  onPrev,
  onNext,
  disablePrev,
  disableNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable disabled={disablePrev} onPress={onPrev} style={[styles.arrow, disablePrev && styles.disabled]}>
        <Ionicons name="chevron-back" size={16} color={theme.colors.textPrimary} />
      </Pressable>
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
      <Pressable disabled={disableNext} onPress={onNext} style={[styles.arrow, disableNext && styles.disabled]}>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 8,
    textTransform: "capitalize",
  },
});
