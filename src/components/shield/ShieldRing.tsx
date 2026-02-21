import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { theme } from "../../theme";

export default function ShieldRing({
  progress,
  size = 260,
  stroke = 14,
  secondsLeft,
  phase = 1,
  beatEnabled = false,
  showCenterLabel = true,
  animate = true,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  secondsLeft: number;
  phase?: 1 | 2 | 3;
  beatEnabled?: boolean;
  showCenterLabel?: boolean;
  animate?: boolean;
}) {
  const p = Math.max(0, Math.min(1, progress));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - p);
  const donePercent = Math.round(p * 100);
  const pulse = useRef(new Animated.Value(0)).current;
  const secondBeatScale = useRef(new Animated.Value(1)).current;
  const secondBeatOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      pulse.setValue(0);
      return () => undefined;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animate, pulse]);

  useEffect(() => {
    if (!animate || !beatEnabled) {
      secondBeatScale.setValue(1);
      secondBeatOpacity.setValue(0);
      return;
    }
    // One visual beat per second for a "heartbeat" feel.
    const beatScale =
      phase === 1 ? 1.1 :
      phase === 2 ? 1.16 :
      1.22;
    const beatOpacity =
      phase === 1 ? 0.45 :
      phase === 2 ? 0.6 :
      0.75;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(secondBeatScale, {
          toValue: beatScale,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(secondBeatScale, {
          toValue: 1,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.timing(secondBeatOpacity, {
          toValue: beatOpacity,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(secondBeatOpacity, {
          toValue: 0,
          duration: 290,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [animate, secondsLeft, secondBeatOpacity, secondBeatScale, beatEnabled, phase]);

  const beatColor =
    phase === 1 ? "rgba(74,222,128,0.75)" :
    phase === 2 ? "rgba(52,211,153,0.85)" :
    "rgba(250,204,21,0.88)";
  const beatSize =
    phase === 1 ? 124 :
    phase === 2 ? 136 :
    148;

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.glowOuter,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />
      <View style={styles.glowInner} />
      {beatEnabled ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.secondBeat,
            {
              width: beatSize,
              height: beatSize,
              borderColor: beatColor,
              opacity: secondBeatOpacity,
              transform: [{ scale: secondBeatScale }],
            },
          ]}
        />
      ) : null}
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
      {showCenterLabel ? (
        <View style={styles.center}>
          <Text style={styles.percent}>{donePercent}%</Text>
        </View>
      ) : null}
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
  secondBeat: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
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

