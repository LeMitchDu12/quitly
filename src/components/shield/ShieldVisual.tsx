import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse } from "react-native-svg";
import { theme } from "../../theme";
import ShieldRing from "./ShieldRing";

export type ShieldVariant = "default" | "defaut" | "morphing" | "glass" | "tension";

export type ShieldVisualProps = {
  progress: number;
  secondsLeft: number;
  phase: 1 | 2 | 3;
  variant?: ShieldVariant;
  premiumFx?: boolean;
  size?: number;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function ellipseCircumference(rx: number, ry: number) {
  return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
}

function CenterLabel({ secondsLeft, progress }: { secondsLeft: number; progress: number }) {
  return (
    <View style={styles.centerLabel}>
      <Text style={styles.time}>{secondsLeft}s</Text>
      <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

function MorphingVisual({ progress, secondsLeft, phase, size = 260 }: ShieldVisualProps) {
  const p = clamp01(progress);
  const morph = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = phase === 1 ? 2200 : phase === 2 ? 3200 : 4200;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(morph, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(morph, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    if (phase === 3) {
      Animated.timing(morph, {
        toValue: 0.5,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return () => undefined;
    }
    anim.start();
    return () => anim.stop();
  }, [morph, phase]);

  const scaleX = morph.interpolate({
    inputRange: [0, 1],
    outputRange: phase === 1 ? [0.95, 1.08] : [0.98, 1.03],
  });
  const scaleY = morph.interpolate({
    inputRange: [0, 1],
    outputRange: phase === 1 ? [1.06, 0.94] : [1.02, 0.98],
  });
  const rotate = morph.interpolate({
    inputRange: [0, 1],
    outputRange: phase === 1 ? ["-3deg", "3deg"] : ["-1deg", "1deg"],
  });

  const rx = size * 0.36;
  const ry = phase === 3 ? size * 0.36 : size * 0.33;
  const c = ellipseCircumference(rx, ry);
  const dashoffset = c * (1 - p);

  return (
    <View style={[styles.baseWrap, { width: size, height: size }]}>
      <View style={styles.softHalo} />
      <Animated.View
        style={[
          styles.morphBlob,
          {
            width: size * 0.78,
            height: size * 0.78,
            transform: [{ scaleX }, { scaleY }, { rotate }],
          },
        ]}
      />
      <Svg width={size} height={size}>
        <Ellipse
          cx={size / 2}
          cy={size / 2}
          rx={rx}
          ry={ry}
          stroke="rgba(74,222,128,0.16)"
          strokeWidth={6}
          fill="none"
        />
        <Ellipse
          cx={size / 2}
          cy={size / 2}
          rx={rx}
          ry={ry}
          stroke={theme.colors.primary}
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dashoffset}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <CenterLabel secondsLeft={secondsLeft} progress={p} />
    </View>
  );
}

function GlassVisual({ progress, secondsLeft, phase, size = 260 }: ShieldVisualProps) {
  const p = clamp01(progress);
  const intro = useRef(new Animated.Value(0)).current;
  const victoryLift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(intro, {
      toValue: 1,
      useNativeDriver: true,
      speed: 12,
      bounciness: 5,
    }).start();
  }, [intro]);

  useEffect(() => {
    Animated.timing(victoryLift, {
      toValue: phase === 3 && p > 0.97 ? 1 : 0,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [phase, p, victoryLift]);

  const scale = intro.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const translateY = victoryLift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  const radius = (size - 12) / 2;
  const c = 2 * Math.PI * radius;
  const dashoffset = c * (1 - p);

  return (
    <Animated.View style={[styles.glassCard, { transform: [{ scale }, { translateY }] }]}>
      <View style={styles.glassHighlight} />
      <View style={styles.glassRingWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={10}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.primary}
            strokeWidth={10}
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        </Svg>
        <CenterLabel secondsLeft={secondsLeft} progress={p} />
      </View>
    </Animated.View>
  );
}

function TensionVisual({ progress, secondsLeft, size = 260 }: ShieldVisualProps) {
  const p = clamp01(progress);
  const jitter = useRef(new Animated.Value(0)).current;
  const intensity = useRef(new Animated.Value(1)).current;
  const unstableGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const j = Animated.loop(
      Animated.sequence([
        Animated.timing(jitter, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(jitter, { toValue: -1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    const g = Animated.loop(
      Animated.sequence([
        Animated.timing(unstableGlow, { toValue: 1, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(unstableGlow, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    j.start();
    g.start();
    return () => {
      j.stop();
      g.stop();
    };
  }, [jitter, unstableGlow]);

  useEffect(() => {
    Animated.timing(intensity, {
      toValue: Math.max(0, 1 - p),
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [intensity, p]);

  const tx = Animated.multiply(jitter, intensity).interpolate({
    inputRange: [-1, 1],
    outputRange: [-1.5, 1.5],
  });
  const ty = Animated.multiply(jitter, intensity).interpolate({
    inputRange: [-1, 1],
    outputRange: [1, -1],
  });
  const glowOpacity = Animated.add(
    unstableGlow.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.32] }),
    intensity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] })
  );

  const radius = (size - 12) / 2;
  const c = 2 * Math.PI * radius;
  const dashoffset = c * (1 - p);

  return (
    <Animated.View style={[styles.baseWrap, { width: size, height: size, transform: [{ translateX: tx }, { translateY: ty }] }]}>
      <Animated.View style={[styles.tensionHalo, { opacity: glowOpacity }]} />
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(74,222,128,0.16)"
          strokeWidth={10}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.primary}
          strokeWidth={10}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <CenterLabel secondsLeft={secondsLeft} progress={p} />
    </Animated.View>
  );
}

export default function ShieldVisual(props: ShieldVisualProps) {
  const variant = props.variant ?? "default";
  const normalized = variant === "defaut" ? "default" : variant;
  const phase = props.phase;

  const glassEnabledShadow = useMemo(
    () => (Platform.OS === "ios" ? styles.glassShadowIOS : styles.glassShadowAndroid),
    []
  );

  if (normalized === "morphing") return <MorphingVisual {...props} />;
  if (normalized === "glass") {
    return (
      <View style={glassEnabledShadow}>
        <GlassVisual {...props} />
      </View>
    );
  }
  if (normalized === "tension") return <TensionVisual {...props} />;

  return (
    <ShieldRing
      progress={props.progress}
      secondsLeft={props.secondsLeft}
      phase={phase}
      beatEnabled={!!props.premiumFx}
      size={props.size}
    />
  );
}

const styles = StyleSheet.create({
  baseWrap: {
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabel: {
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
  softHalo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.1)",
  },
  morphBlob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
  },
  glassShadowIOS: {
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  glassShadowAndroid: {
    elevation: 6,
  },
  glassCard: {
    alignSelf: "center",
    width: 310,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 20,
    paddingHorizontal: 18,
    overflow: "hidden",
  },
  glassHighlight: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 28,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  glassRingWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  tensionHalo: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.24)",
  },
});
