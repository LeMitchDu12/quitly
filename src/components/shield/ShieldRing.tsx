import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { theme } from "../../theme";

export default function ShieldRing({
  progress,
  size = 260,
  stroke = 14,
  secondsLeft,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  secondsLeft: number;
}) {
  const p = Math.max(0, Math.min(1, progress));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - p);
  const donePercent = Math.round(p * 100);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius + 4}
          stroke="rgba(74,222,128,0.15)"
          strokeWidth={2}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.divider}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.time}>{secondsLeft}s</Text>
        <Text style={styles.percent}>{donePercent}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  glowOuter: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.08)",
  },
  glowInner: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.06)",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    color: theme.colors.textPrimary,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  percent: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
