import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse } from "react-native-svg";
import { theme } from "../../theme";
import ShieldRing from "./ShieldRing";

export type ShieldVariant =
  | "default"
  | "defaut"
  | "morphing"
  | "glass"
  | "tension"
  | "bubbles"
  | "bubblesV2"
  | "bubblesV3"
  | "flow"
  | "geoV1"
  | "geoV2"
  | "geoV3"
  | "geoV4";

export type ShieldVisualProps = {
  progress: number;
  secondsLeft: number;
  phase: 1 | 2 | 3;
  variant?: ShieldVariant;
  premiumFx?: boolean;
  size?: number;
  showCenterLabel?: boolean;
  animate?: boolean;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function ellipseCircumference(rx: number, ry: number) {
  return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
}

function CenterLabel({ secondsLeft: _secondsLeft, progress }: { secondsLeft: number; progress: number }) {
  return (
    <View style={styles.centerLabel}>
      <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

function MorphingVisual({ progress, secondsLeft, phase, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const morph = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      morph.setValue(phase === 3 ? 0.5 : 0);
      return () => undefined;
    }
    const duration = phase === 1 ? 2200 : phase === 2 ? 3200 : 4200;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(morph, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(morph, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    if (phase === 3) {
      Animated.timing(morph, {
        toValue: 0.5,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return () => undefined;
    }
    anim.start();
    return () => anim.stop();
  }, [animate, morph, phase]);

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
      {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
    </View>
  );
}

function GlassVisual({ progress, secondsLeft, phase, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const intro = useRef(new Animated.Value(0)).current;
  const victoryLift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      intro.setValue(1);
      return () => undefined;
    }
    Animated.spring(intro, {
      toValue: 1,
      useNativeDriver: false,
      speed: 12,
      bounciness: 5,
    }).start();
  }, [animate, intro]);

  useEffect(() => {
    if (!animate) return;
    Animated.timing(victoryLift, {
      toValue: phase === 3 && p > 0.97 ? 1 : 0,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animate, phase, p, victoryLift]);

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
        {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
      </View>
    </Animated.View>
  );
}

function TensionVisual({ progress, secondsLeft, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const jitter = useRef(new Animated.Value(0)).current;
  const intensity = useRef(new Animated.Value(1)).current;
  const unstableGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      jitter.setValue(0);
      unstableGlow.setValue(0);
      return () => undefined;
    }
    const j = Animated.loop(
      Animated.sequence([
        Animated.timing(jitter, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(jitter, { toValue: -1, duration: 120, easing: Easing.linear, useNativeDriver: false }),
      ])
    );
    const g = Animated.loop(
      Animated.sequence([
        Animated.timing(unstableGlow, { toValue: 1, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(unstableGlow, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    j.start();
    g.start();
    return () => {
      j.stop();
      g.stop();
    };
  }, [animate, jitter, unstableGlow]);

  useEffect(() => {
    if (!animate) {
      intensity.setValue(0);
      return;
    }
    Animated.timing(intensity, {
      toValue: Math.max(0, 1 - p),
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [animate, intensity, p]);

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
      {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
    </Animated.View>
  );
}

function BubblesVisual({ progress, secondsLeft, phase, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const orbit = useRef(new Animated.Value(0)).current;
  const morph = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      orbit.setValue(0);
      return () => undefined;
    }
    const orbitDuration = phase === 1 ? 5200 : phase === 2 ? 4300 : 3400;
    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: orbitDuration,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    orbit.setValue(0);
    orbitLoop.start();
    return () => orbitLoop.stop();
  }, [animate, orbit, phase]);

  useEffect(() => {
    if (!animate) {
      morph.setValue(0);
      return () => undefined;
    }
    const morphDuration = phase === 1 ? 2600 : phase === 2 ? 2200 : 1800;
    const morphLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(morph, {
          toValue: 1,
          duration: morphDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(morph, {
          toValue: 0,
          duration: morphDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    morphLoop.start();
    return () => morphLoop.stop();
  }, [animate, morph, phase]);

  const radius = (size - 12) / 2;
  const c = 2 * Math.PI * radius;
  const dashoffset = c * (1 - p);

  const b1x = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-40, 0, 38, 0, -40] });
  const b1y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-10, 24, -8, -22, -10] });
  const b2x = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [40, 0, -38, 0, 40] });
  const b2y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [14, -20, 12, 24, 14] });
  const b3x = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-14, 24, 10, -22, -14] });
  const b3y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-34, -8, 24, 6, -34] });
  const b4x = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -30, 0, 30, 0] });
  const b4y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [30, 0, -30, 0, 30] });
  const b5x = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [26, 12, -20, -8, 26] });
  const b5y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [22, -24, -14, 24, 22] });

  const bubbleScaleA = morph.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] });
  const bubbleScaleB = morph.interpolate({ inputRange: [0, 1], outputRange: [1.14, 0.9] });
  const bubbleScaleC = morph.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const bubbleScaleD = morph.interpolate({ inputRange: [0, 1], outputRange: [1.08, 0.92] });

  return (
    <View style={[styles.baseWrap, { width: size, height: size }]}>
      <View style={styles.bubbleAmbientGlow} />
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(74,222,128,0.14)" strokeWidth={10} fill="none" />
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

      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleA,
          { transform: [{ translateX: b1x }, { translateY: b1y }, { scaleX: bubbleScaleA }, { scaleY: bubbleScaleB }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleB,
          { transform: [{ translateX: b2x }, { translateY: b2y }, { scaleX: bubbleScaleB }, { scaleY: bubbleScaleA }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleC,
          { transform: [{ translateX: b3x }, { translateY: b3y }, { scaleX: bubbleScaleC }, { scaleY: bubbleScaleD }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleD,
          { transform: [{ translateX: b4x }, { translateY: b4y }, { scaleX: bubbleScaleD }, { scaleY: bubbleScaleC }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleE,
          { transform: [{ translateX: b5x }, { translateY: b5y }, { scaleX: bubbleScaleC }, { scaleY: bubbleScaleA }] },
        ]}
      />
      {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
    </View>
  );
}

function BubblesVisualV2({ progress, secondsLeft, phase, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const orbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      orbit.setValue(0);
      return () => undefined;
    }
    const orbitDuration = phase === 1 ? 6000 : phase === 2 ? 4600 : 3600;
    const loop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: orbitDuration,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    orbit.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [animate, orbit, phase]);

  useEffect(() => {
    if (!animate) {
      pulse.setValue(0);
      return () => undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: phase === 3 ? 700 : 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: phase === 3 ? 700 : 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, pulse, phase]);

  useEffect(() => {
    if (!animate) {
      drift.setValue(0);
      return () => undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, drift]);

  const radius = (size - 12) / 2;
  const c = 2 * Math.PI * radius;
  const dashoffset = c * (1 - p);

  const mergeScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.14] });
  const splitScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.08, 0.9] });
  const nudge = drift.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] });

  const aX = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [-46, -6, 34, -6, -46] });
  const aY = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [8, 30, -8, -24, 8] });
  const bX = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [46, 6, -34, 6, 46] });
  const bY = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [-8, -28, 10, 22, -8] });
  const cX = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [0, 24, 0, -24, 0] });
  const cY = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [36, 4, -36, 4, 36] });
  const dX = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [24, -8, -28, 4, 24] });
  const dY = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [26, -30, -4, 28, 26] });
  const eX = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [-24, 8, 28, -4, -24] });
  const eY = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [-26, 30, 4, -28, -26] });

  const centerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] });

  return (
    <View style={[styles.baseWrap, { width: size, height: size }]}>
      <Animated.View style={[styles.bubbleV2Core, { opacity: centerOpacity, transform: [{ scale: mergeScale }] }]} />
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(74,222,128,0.14)" strokeWidth={10} fill="none" />
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

      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleV2A,
          { transform: [{ translateX: aX }, { translateY: aY }, { scaleX: mergeScale }, { scaleY: splitScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleV2B,
          { transform: [{ translateX: bX }, { translateY: bY }, { scaleX: splitScale }, { scaleY: mergeScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleV2C,
          { transform: [{ translateX: cX }, { translateY: Animated.add(cY, nudge) }, { scale: mergeScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleV2D,
          { transform: [{ translateX: dX }, { translateY: dY }, { scaleX: splitScale }, { scaleY: mergeScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleV2E,
          { transform: [{ translateX: eX }, { translateY: eY }, { scaleX: mergeScale }, { scaleY: splitScale }] },
        ]}
      />

      {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
    </View>
  );
}

function BubblesVisualV3({ progress, secondsLeft, phase, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const orbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const hue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      orbit.setValue(0);
      return () => undefined;
    }
    const orbitDuration = phase === 1 ? 7000 : phase === 2 ? 5200 : 3900;
    const loop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: orbitDuration,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    orbit.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [animate, orbit, phase]);

  useEffect(() => {
    if (!animate) {
      pulse.setValue(0);
      return () => undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: phase === 3 ? 780 : 1080,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: phase === 3 ? 780 : 1080,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, pulse, phase]);

  useEffect(() => {
    if (!animate) {
      hue.setValue(0);
      return () => undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hue, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(hue, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, hue]);

  const radius = (size - 12) / 2;
  const c = 2 * Math.PI * radius;
  const dashoffset = c * (1 - p);

  const aX = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [-62, -14, 48, -14, -62] });
  const aY = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [10, 38, -12, -30, 10] });
  const bX = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [62, 14, -48, 14, 62] });
  const bY = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [-10, -36, 14, 28, -10] });
  const cX = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [0, 34, 0, -34, 0] });
  const cY = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [52, 8, -52, 8, 52] });
  const dX = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [38, -12, -42, 8, 38] });
  const dY = orbit.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [36, -44, -4, 40, 36] });

  const merge = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.2] });
  const split = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.14, 0.86] });

  const colorA = hue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["rgba(74,222,128,0.32)", "rgba(56,189,248,0.32)", "rgba(250,204,21,0.32)"],
  });
  const colorB = hue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["rgba(16,185,129,0.28)", "rgba(129,140,248,0.28)", "rgba(244,114,182,0.28)"],
  });
  const colorC = hue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["rgba(52,211,153,0.28)", "rgba(45,212,191,0.28)", "rgba(251,191,36,0.28)"],
  });

  return (
    <View style={[styles.baseWrap, { width: size, height: size }]}>
      <Animated.View style={[styles.bubbleV3Core, { transform: [{ scale: merge }], backgroundColor: colorA }]} />
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(74,222,128,0.14)" strokeWidth={10} fill="none" />
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

      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleV3A,
          { backgroundColor: colorA, transform: [{ translateX: aX }, { translateY: aY }, { scaleX: merge }, { scaleY: split }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleV3B,
          { backgroundColor: colorB, transform: [{ translateX: bX }, { translateY: bY }, { scaleX: split }, { scaleY: merge }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleV3C,
          { backgroundColor: colorC, transform: [{ translateX: cX }, { translateY: cY }, { scale: merge }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubbleBase,
          styles.bubbleV3D,
          { backgroundColor: colorB, transform: [{ translateX: dX }, { translateY: dY }, { scaleX: merge }, { scaleY: split }] },
        ]}
      />

      {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
    </View>
  );
}

function GeometricVisualV1({ progress, secondsLeft, phase, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const orbit = useRef(new Animated.Value(0)).current;
  const shapePhase = useRef(new Animated.Value(0)).current;
  const hue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      orbit.setValue(0);
      return () => undefined;
    }
    const orbitDuration = phase === 1 ? 9600 : phase === 2 ? 8200 : 7000;
    const loop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: orbitDuration,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    orbit.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [animate, orbit, phase]);

  useEffect(() => {
    if (!animate) {
      shapePhase.setValue(0);
      return () => undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shapePhase, {
          toValue: 1,
          duration: 9600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(shapePhase, {
          toValue: 0,
          duration: 9600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, shapePhase]);

  useEffect(() => {
    if (!animate) {
      hue.setValue(0);
      return () => undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hue, {
          toValue: 1,
          duration: 7200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(hue, {
          toValue: 0,
          duration: 7200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, hue]);

  const radius = (size - 12) / 2;
  const c = 2 * Math.PI * radius;
  const dashoffset = c * (1 - p);

  const t1x = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-54, -8, 44, -8, -54] });
  const t1y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [16, 42, -14, -30, 16] });
  const t2x = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [56, 12, -46, 12, 56] });
  const t2y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-14, -38, 16, 28, -14] });
  const t3x = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 34, 0, -34, 0] });
  const t3y = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [56, 8, -56, 8, 56] });

  const squareOpacity = shapePhase.interpolate({
    inputRange: [0, 0.24, 0.38, 1],
    outputRange: [1, 1, 0, 0],
    extrapolate: "clamp",
  });
  const triangleOpacity = shapePhase.interpolate({
    inputRange: [0, 0.24, 0.38, 0.62, 0.76, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
    extrapolate: "clamp",
  });
  const circleOpacity = shapePhase.interpolate({
    inputRange: [0, 0.62, 0.76, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: "clamp",
  });

  const colorA = hue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["rgba(74,222,128,0.3)", "rgba(56,189,248,0.3)", "rgba(250,204,21,0.3)"],
  });
  const colorB = hue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["rgba(16,185,129,0.28)", "rgba(129,140,248,0.28)", "rgba(244,114,182,0.28)"],
  });
  const colorC = hue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["rgba(52,211,153,0.28)", "rgba(45,212,191,0.28)", "rgba(251,191,36,0.28)"],
  });

  const spin = shapePhase.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View style={[styles.baseWrap, { width: size, height: size }]}>
      <View style={styles.geoAmbientGlow} />
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(74,222,128,0.14)" strokeWidth={10} fill="none" />
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

      <Animated.View style={[styles.geoTokenWrap, { transform: [{ translateX: t1x }, { translateY: t1y }, { rotate: spin }] }]}>
        <Animated.View style={[styles.geoSquare, { opacity: squareOpacity, backgroundColor: colorA }]} />
        <Animated.View style={[styles.geoTriangle, { opacity: triangleOpacity, borderBottomColor: colorA }]} />
        <Animated.View style={[styles.geoCircle, { opacity: circleOpacity, backgroundColor: colorA }]} />
      </Animated.View>

      <Animated.View style={[styles.geoTokenWrap, { transform: [{ translateX: t2x }, { translateY: t2y }, { rotate: spin }] }]}>
        <Animated.View style={[styles.geoSquare, { opacity: squareOpacity, backgroundColor: colorB }]} />
        <Animated.View style={[styles.geoTriangle, { opacity: triangleOpacity, borderBottomColor: colorB }]} />
        <Animated.View style={[styles.geoCircle, { opacity: circleOpacity, backgroundColor: colorB }]} />
      </Animated.View>

      <Animated.View style={[styles.geoTokenWrap, { transform: [{ translateX: t3x }, { translateY: t3y }, { rotate: spin }] }]}>
        <Animated.View style={[styles.geoSquare, { opacity: squareOpacity, backgroundColor: colorC }]} />
        <Animated.View style={[styles.geoTriangle, { opacity: triangleOpacity, borderBottomColor: colorC }]} />
        <Animated.View style={[styles.geoCircle, { opacity: circleOpacity, backgroundColor: colorC }]} />
      </Animated.View>

      {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
    </View>
  );
}

type GeoV2Shape = "circle" | "square" | "triangle";
type GeoV2Token = {
  id: string;
  kind: GeoV2Shape;
  size: number;
  xPath: number[];
  yPath: number[];
  sPath: number[];
  rPath: string[];
  oPath: number[];
  palette: [string, string, string];
};

function randomIn(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomChoice<T>(arr: T[]): T {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i] as T;
}

function buildGeoV2Tokens(): GeoV2Token[] {
  const baseKinds: GeoV2Shape[] = ["circle", "square", "triangle"];
  const extraCount = 2 + Math.floor(Math.random() * 2); // 2-3 extras
  const kinds: GeoV2Shape[] = [...baseKinds];
  for (let i = 0; i < extraCount; i += 1) {
    kinds.push(randomChoice(baseKinds));
  }

  return kinds.map((kind, idx) => {
    const ampX = randomIn(24, 68);
    const ampY = randomIn(20, 64);
    const startX = randomIn(-ampX, ampX);
    const startY = randomIn(-ampY, ampY);
    const p2x = randomIn(-ampX, ampX);
    const p2y = randomIn(-ampY, ampY);
    const p3x = randomIn(-ampX, ampX);
    const p3y = randomIn(-ampY, ampY);
    const p4x = randomIn(-ampX, ampX);
    const p4y = randomIn(-ampY, ampY);
    const s0 = randomIn(0.72, 1.18);
    const s1 = randomIn(0.76, 1.24);
    const s2 = randomIn(0.68, 1.16);
    const s3 = randomIn(0.8, 1.22);
    const r0 = randomIn(-26, 26);
    const r1 = randomIn(-32, 32);
    const r2 = randomIn(-28, 28);
    const r3 = randomIn(-30, 30);
    const o0 = randomIn(0.35, 0.85);
    const o1 = randomIn(0.45, 0.95);
    const o2 = randomIn(0.3, 0.75);
    const o3 = randomIn(0.4, 0.9);

    const palettes: Array<[string, string, string]> = [
      ["rgba(74,222,128,0.32)", "rgba(56,189,248,0.32)", "rgba(250,204,21,0.32)"],
      ["rgba(16,185,129,0.3)", "rgba(129,140,248,0.3)", "rgba(244,114,182,0.3)"],
      ["rgba(52,211,153,0.3)", "rgba(45,212,191,0.3)", "rgba(251,191,36,0.3)"],
      ["rgba(187,247,208,0.28)", "rgba(96,165,250,0.28)", "rgba(249,168,212,0.28)"],
    ];

    return {
      id: `geo-v2-${idx}-${kind}`,
      kind,
      size: randomIn(34, 96),
      xPath: [startX, p2x, p3x, p4x, startX],
      yPath: [startY, p2y, p3y, p4y, startY],
      sPath: [s0, s1, s2, s3, s0],
      rPath: [`${r0}deg`, `${r1}deg`, `${r2}deg`, `${r3}deg`, `${r0}deg`],
      oPath: [o0, o1, o2, o3, o0],
      palette: randomChoice(palettes),
    };
  });
}

function GeometricVisualV2({ progress, secondsLeft, phase, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const movement = useRef(new Animated.Value(0)).current;
  const hue = useRef(new Animated.Value(0)).current;
  const tokens = useMemo(() => buildGeoV2Tokens(), []);

  useEffect(() => {
    if (!animate) {
      movement.setValue(0);
      return () => undefined;
    }
    const movementDuration = phase === 1 ? 11000 : phase === 2 ? 9600 : 8400;
    const loop = Animated.loop(
      Animated.timing(movement, {
        toValue: 1,
        duration: movementDuration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false,
      })
    );
    movement.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [animate, movement, phase]);

  useEffect(() => {
    if (!animate) {
      hue.setValue(0);
      return () => undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hue, {
          toValue: 1,
          duration: 8800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(hue, {
          toValue: 0,
          duration: 8800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, hue]);

  const radius = (size - 12) / 2;
  const c = 2 * Math.PI * radius;
  const dashoffset = c * (1 - p);

  return (
    <View style={[styles.baseWrap, { width: size, height: size }]}>
      <View style={styles.geoV2AmbientGlow} />
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(74,222,128,0.14)" strokeWidth={10} fill="none" />
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

      {tokens.map((token) => {
        const tx = movement.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: token.xPath });
        const ty = movement.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: token.yPath });
        const sc = movement.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: token.sPath });
        const rot = movement.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: token.rPath });
        const op = movement.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: token.oPath });
        const color = hue.interpolate({ inputRange: [0, 0.5, 1], outputRange: token.palette });

        if (token.kind === "triangle") {
          const triangleHalf = token.size / 2;
          const triangleHeight = Math.max(20, token.size * 0.86);
          return (
            <Animated.View
              key={token.id}
              style={[
                styles.geoV2TokenWrap,
                { opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }, { rotate: rot }] },
              ]}
            >
              <Animated.View
                style={[
                  styles.geoV2Triangle,
                  {
                    borderLeftWidth: triangleHalf,
                    borderRightWidth: triangleHalf,
                    borderBottomWidth: triangleHeight,
                    borderBottomColor: color,
                  },
                ]}
              />
            </Animated.View>
          );
        }

        const shapeStyle =
          token.kind === "circle"
            ? { borderRadius: token.size / 2 }
            : { borderRadius: Math.max(8, token.size * 0.16) };

        return (
          <Animated.View
            key={token.id}
            style={[
              styles.geoV2TokenWrap,
              {
                opacity: op,
                transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }, { rotate: rot }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.geoV2Shape,
                shapeStyle,
                {
                  width: token.size,
                  height: token.size,
                  backgroundColor: color,
                },
              ]}
            />
          </Animated.View>
        );
      })}

      {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
    </View>
  );
}

type GeoV3Shape = "circle" | "square" | "triangle";
type GeoV3Token = {
  id: string;
  kind: GeoV3Shape;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  morphOffset: number;
  morphSpeed: number;
  colorOffset: number;
  colorSpeed: number;
  visOffset: number;
  visSpeed: number;
};

type GeoV4Token = {
  id: string;
  kind: GeoV3Shape;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  colorOffset: number;
  colorSpeed: number;
  palette: [Rgba, Rgba, Rgba];
  hitGlow: number;
  lastHitAt: number;
  lastMutateAt: number;
};

type Rgba = [number, number, number, number];

function wrap01(n: number) {
  const v = n % 1;
  return v < 0 ? v + 1 : v;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mixRgba(a: Rgba, b: Rgba, t: number): Rgba {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
}

function rgbaToString(c: Rgba) {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, c[3])).toFixed(3)})`;
}

function cyclicDistance(a: number, b: number, period: number) {
  const d = Math.abs(a - b) % period;
  return Math.min(d, period - d);
}

function shapeWeight(morph: number, index: number) {
  return clamp01(1 - cyclicDistance(morph, index, 3));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomShapeKind(): GeoV3Shape {
  const kinds: GeoV3Shape[] = ["circle", "square", "triangle"];
  return kinds[Math.floor(Math.random() * kinds.length)] ?? "circle";
}

function pickPalette(): [Rgba, Rgba, Rgba] {
  const palettes: Array<[Rgba, Rgba, Rgba]> = [
    [
      [74, 222, 128, 0.32],
      [56, 189, 248, 0.32],
      [250, 204, 21, 0.32],
    ],
    [
      [16, 185, 129, 0.3],
      [129, 140, 248, 0.3],
      [244, 114, 182, 0.3],
    ],
    [
      [52, 211, 153, 0.3],
      [45, 212, 191, 0.3],
      [251, 191, 36, 0.3],
    ],
  ];
  return palettes[Math.floor(Math.random() * palettes.length)] ?? palettes[0];
}

function colorAt(t: number, palette: [Rgba, Rgba, Rgba]) {
  const normalized = wrap01(t);
  if (normalized < 0.5) {
    return mixRgba(palette[0], palette[1], normalized / 0.5);
  }
  return mixRgba(palette[1], palette[2], (normalized - 0.5) / 0.5);
}

function GeometricVisualV3({ progress, secondsLeft, phase, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const [, forceRender] = useState(0);
  const tokensRef = useRef<GeoV3Token[]>([]);
  const paletteRef = useRef<[Rgba, Rgba, Rgba]>(pickPalette());
  const timeRef = useRef(0);

  useEffect(() => {
    if (tokensRef.current.length > 0) return;

    const count = 3;
    const tokens: GeoV3Token[] = [];
    for (let i = 0; i < count; i += 1) {
      const sizePx = randomBetween(34, 92);
      tokens.push({
        id: `geo-v3-${i}`,
        kind: randomShapeKind(),
        size: sizePx,
        x: randomBetween(-42, 42),
        y: randomBetween(-42, 42),
        vx: randomBetween(-20, 20),
        vy: randomBetween(-20, 20),
        rotation: randomBetween(-25, 25),
        vr: randomBetween(-26, 26),
        morphOffset: randomBetween(0, 3),
        morphSpeed: randomBetween(0.08, 0.15),
        colorOffset: randomBetween(0, 1),
        colorSpeed: randomBetween(0.035, 0.065),
        visOffset: randomBetween(0, Math.PI * 2),
        visSpeed: randomBetween(0.45, 0.95),
      });
    }
    tokensRef.current = tokens;
  }, []);

  useEffect(() => {
    if (!animate) return () => undefined;
    const intervalMs = 40;
    const dtBase = intervalMs / 1000;
    const speedScale = phase === 1 ? 0.85 : phase === 2 ? 0.95 : 1.05;
    const arenaRadius = (size - 12) / 2 - 8;

    const id = setInterval(() => {
      const dt = dtBase * speedScale;
      timeRef.current += dt;

      const tokens = tokensRef.current;
      for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (!token) continue;

        token.x += token.vx * dt;
        token.y += token.vy * dt;
        token.rotation += token.vr * dt;

        const tokenRadius = token.size * 0.52;
        const maxR = Math.max(16, arenaRadius - tokenRadius);
        const dist = Math.sqrt(token.x * token.x + token.y * token.y);

        if (dist > maxR) {
          const nx = token.x / dist;
          const ny = token.y / dist;
          token.x = nx * maxR;
          token.y = ny * maxR;

          const dot = token.vx * nx + token.vy * ny;
          token.vx = token.vx - 2 * dot * nx;
          token.vy = token.vy - 2 * dot * ny;
        }
      }

      forceRender((n) => n + 1);
    }, intervalMs);

    return () => clearInterval(id);
  }, [animate, phase, size]);

  const radius = (size - 12) / 2;
  const c = 2 * Math.PI * radius;
  const dashoffset = c * (1 - p);

  const tokens = tokensRef.current;
  const globalTime = timeRef.current;
  const palette = paletteRef.current;
  const targetVisible = Math.max(
    2,
    Math.min(4, 2 + Math.floor(((Math.sin(globalTime * 0.23) + Math.sin(globalTime * 0.11 + 1.7) + 2) / 4) * 3))
  );
  const ranked = tokens
    .map((token, idx) => {
      const gate = (Math.sin(globalTime * token.visSpeed + token.visOffset) + 1) / 2;
      return { idx, gate };
    })
    .sort((a, b) => b.gate - a.gate);
  const visibleSet = new Set(ranked.slice(0, targetVisible).map((entry) => entry.idx));

  return (
    <View style={[styles.baseWrap, { width: size, height: size }]}>
      <View style={styles.geoV3AmbientGlow} />
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(74,222,128,0.14)" strokeWidth={10} fill="none" />
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

      {tokens.map((token, idx) => {
        const gate = (Math.sin(globalTime * token.visSpeed + token.visOffset) + 1) / 2;
        const isVisible = visibleSet.has(idx);
        const visibilityOpacity = isVisible ? 0.25 + gate * 0.75 : 0;
        if (visibilityOpacity <= 0.02) return null;

        const morph = (globalTime * token.morphSpeed + token.morphOffset) % 3;
        const squareOpacity = shapeWeight(morph, 0);
        const triangleOpacity = shapeWeight(morph, 1);
        const circleOpacity = shapeWeight(morph, 2);
        const color = rgbaToString(colorAt(globalTime * token.colorSpeed + token.colorOffset, palette));
        const borderColor = "rgba(186,230,253,0.35)";
        const triangleHalf = token.size / 2;
        const triangleHeight = Math.max(20, token.size * 0.86);

        return (
          <View
            key={token.id}
            style={[
              styles.geoV3TokenWrap,
              {
                width: token.size,
                height: token.size,
                opacity: visibilityOpacity,
                transform: [{ translateX: token.x }, { translateY: token.y }, { rotate: `${token.rotation}deg` }],
              },
            ]}
          >
            <View
              style={[
                styles.geoV3Square,
                {
                  width: token.size,
                  height: token.size,
                  opacity: squareOpacity,
                  backgroundColor: color,
                  borderColor,
                },
              ]}
            />
            <View
              style={[
                styles.geoV3Triangle,
                {
                  opacity: triangleOpacity,
                  borderLeftWidth: triangleHalf,
                  borderRightWidth: triangleHalf,
                  borderBottomWidth: triangleHeight,
                  borderBottomColor: color,
                },
              ]}
            />
            <View
              style={[
                styles.geoV3Circle,
                {
                  width: token.size,
                  height: token.size,
                  borderRadius: token.size / 2,
                  opacity: circleOpacity,
                  backgroundColor: color,
                  borderColor,
                },
              ]}
            />
          </View>
        );
      })}

      {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
    </View>
  );
}

function GeometricVisualV4({ progress, secondsLeft, phase, size = 260, showCenterLabel = true, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const [, forceRender] = useState(0);
  const tokensRef = useRef<GeoV4Token[]>([]);
  const timeRef = useRef(0);
  const nextIdRef = useRef(3);
  const lastSpawnAtRef = useRef(-999);
  const lastPruneAtRef = useRef(-999);

  const createGeoV4Token = (seed?: Partial<GeoV4Token>): GeoV4Token => {
    const s = Math.min(74, randomBetween(36, 74));
    return {
      id: `geo-v4-${nextIdRef.current++}`,
      kind: randomShapeKind(),
      size: s,
      x: randomBetween(-24, 24),
      y: randomBetween(-24, 24),
      vx: randomBetween(-12, 12),
      vy: randomBetween(-12, 12),
      rotation: randomBetween(-25, 25),
      vr: randomBetween(-18, 18),
      colorOffset: randomBetween(0, 1),
      colorSpeed: randomBetween(0.05, 0.09),
      palette: pickPalette(),
      hitGlow: 0,
      lastHitAt: -999,
      lastMutateAt: -999,
      ...seed,
    };
  };

  useEffect(() => {
    if (tokensRef.current.length > 0) return;
    const baseDist = 52;
    const angle = randomBetween(0, Math.PI * 2);
    const x = Math.cos(angle) * baseDist;
    const y = Math.sin(angle) * baseDist;
    const speed = randomBetween(12, 16);
    const vx = Math.cos(angle + Math.PI / 2) * speed;
    const vy = Math.sin(angle + Math.PI / 2) * speed;
    const sizeA = Math.min(74, randomBetween(44, 74));
    const sizeB = Math.min(74, randomBetween(44, 74));
    const sizeC = Math.min(70, randomBetween(38, 70));

    tokensRef.current = [
      createGeoV4Token({ id: "geo-v4-0", size: sizeA, x, y, vx, vy }),
      createGeoV4Token({ id: "geo-v4-1", size: sizeB, x: -x, y: -y, vx: -vx, vy: -vy }),
      createGeoV4Token({
        id: "geo-v4-2",
        size: sizeC,
        x: randomBetween(-22, 22),
        y: randomBetween(-22, 22),
        vx: randomBetween(-10, 10),
        vy: randomBetween(-10, 10),
        vr: randomBetween(-14, 14),
      }),
    ];
  }, []);

  useEffect(() => {
    if (!animate) return () => undefined;
    const intervalMs = 40;
    const dtBase = intervalMs / 1000;
    const speedScale = phase === 1 ? 0.72 : phase === 2 ? 0.8 : 0.9;
    const arenaRadius = (size - 12) / 2 - 8;
    const collisionCooldownSec = 0.28;
    const mutationCooldownSec = 1.8;
    const spawnCooldownSec = 1.2;
    const pruneCooldownSec = 1.6;
    const minShapes = 3;
    const maxShapes = 5;

    const id = setInterval(() => {
      const dt = dtBase * speedScale;
      timeRef.current += dt;
      const tNow = timeRef.current;
      const tokens = tokensRef.current;
      const removeIds = new Set<string>();
      let spawnPayload: Partial<GeoV4Token> | null = null;

      for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (!token) continue;
        token.x += token.vx * dt;
        token.y += token.vy * dt;
        token.rotation += token.vr * dt;
        token.hitGlow = Math.max(0, token.hitGlow - dt * 1.5);

        const tokenRadius = token.size * 0.52;
        const maxR = Math.max(16, arenaRadius - tokenRadius);
        const dist = Math.sqrt(token.x * token.x + token.y * token.y);
        if (dist > maxR) {
          const nx = token.x / dist;
          const ny = token.y / dist;
          token.x = nx * maxR;
          token.y = ny * maxR;
          const dot = token.vx * nx + token.vy * ny;
          token.vx = token.vx - 2 * dot * nx;
          token.vy = token.vy - 2 * dot * ny;
          token.hitGlow = Math.min(1, token.hitGlow + 0.45);
        }
      }

      for (let i = 0; i < tokens.length; i += 1) {
        for (let j = i + 1; j < tokens.length; j += 1) {
          const a = tokens[i];
          const b = tokens[j];
          if (!a || !b) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
          const minDist = a.size * 0.5 + b.size * 0.5;
          if (dist >= minDist) continue;

          if (tNow - a.lastHitAt < collisionCooldownSec || tNow - b.lastHitAt < collisionCooldownSec) {
            continue;
          }

          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          a.x -= nx * (overlap * 0.5);
          a.y -= ny * (overlap * 0.5);
          b.x += nx * (overlap * 0.5);
          b.y += ny * (overlap * 0.5);

          const avn = a.vx * nx + a.vy * ny;
          const bvn = b.vx * nx + b.vy * ny;
          const avtx = a.vx - avn * nx;
          const avty = a.vy - avn * ny;
          const bvtx = b.vx - bvn * nx;
          const bvty = b.vy - bvn * ny;

          a.vx = avtx + bvn * nx;
          a.vy = avty + bvn * ny;
          b.vx = bvtx + avn * nx;
          b.vy = bvty + avn * ny;

          a.lastHitAt = tNow;
          b.lastHitAt = tNow;
          a.hitGlow = 1;
          b.hitGlow = 1;

          if (tNow - a.lastMutateAt > mutationCooldownSec && Math.random() < 0.22) {
            if (Math.random() < 0.6) a.kind = randomShapeKind();
            if (Math.random() < 0.45) a.palette = pickPalette();
            a.colorOffset = wrap01(a.colorOffset + randomBetween(0.12, 0.26));
            a.vr += randomBetween(-8, 8);
            a.lastMutateAt = tNow;
          }
          if (tNow - b.lastMutateAt > mutationCooldownSec && Math.random() < 0.22) {
            if (Math.random() < 0.6) b.kind = randomShapeKind();
            if (Math.random() < 0.45) b.palette = pickPalette();
            b.colorOffset = wrap01(b.colorOffset + randomBetween(0.12, 0.26));
            b.vr += randomBetween(-8, 8);
            b.lastMutateAt = tNow;
          }

          if (!spawnPayload && tokens.length < maxShapes && tNow - lastSpawnAtRef.current > spawnCooldownSec && Math.random() < 0.26) {
            const mx = (a.x + b.x) * 0.5 + randomBetween(-8, 8);
            const my = (a.y + b.y) * 0.5 + randomBetween(-8, 8);
            spawnPayload = {
              x: mx,
              y: my,
              vx: randomBetween(-9, 9),
              vy: randomBetween(-9, 9),
              size: Math.min(66, randomBetween(34, 66)),
              hitGlow: 1,
              lastHitAt: tNow,
            };
          }

          const currentCount = tokens.length - removeIds.size;
          if (currentCount > minShapes && tNow - lastPruneAtRef.current > pruneCooldownSec && Math.random() < 0.2) {
            const pick = Math.random() < 0.5 ? a : b;
            if (!removeIds.has(pick.id) && tNow - pick.lastHitAt > collisionCooldownSec) {
              removeIds.add(pick.id);
              lastPruneAtRef.current = tNow;
            }
          }
        }
      }

      if (removeIds.size > 0) {
        tokensRef.current = tokensRef.current.filter((token) => !removeIds.has(token.id));
      }
      if (spawnPayload && tokensRef.current.length < maxShapes) {
        tokensRef.current.push(createGeoV4Token(spawnPayload));
        lastSpawnAtRef.current = tNow;
      }

      forceRender((n) => n + 1);
    }, intervalMs);

    return () => clearInterval(id);
  }, [animate, phase, size]);

  const radius = (size - 12) / 2;
  const c = 2 * Math.PI * radius;
  const dashoffset = c * (1 - p);
  const tokens = tokensRef.current;
  const globalTime = timeRef.current;

  return (
    <View style={[styles.baseWrap, { width: size, height: size }]}>
      <View style={styles.geoV4AmbientGlow} />
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(74,222,128,0.14)" strokeWidth={10} fill="none" />
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

      {tokens.map((token) => {
        const color = rgbaToString(colorAt(globalTime * token.colorSpeed + token.colorOffset + token.hitGlow * 0.25, token.palette));
        const borderColor = "rgba(186,230,253,0.36)";
        const alpha = 0.78 + token.hitGlow * 0.22;
        const triangleHalf = token.size / 2;
        const triangleHeight = Math.max(20, token.size * 0.86);

        return (
          <View
            key={token.id}
            style={[
              styles.geoV4TokenWrap,
              {
                width: token.size,
                height: token.size,
                opacity: alpha,
                transform: [{ translateX: token.x }, { translateY: token.y }, { rotate: `${token.rotation}deg` }],
              },
            ]}
          >
            {token.kind === "square" ? (
              <View
                style={[
                  styles.geoV4Square,
                  { width: token.size, height: token.size, backgroundColor: color, borderColor },
                ]}
              />
            ) : null}
            {token.kind === "circle" ? (
              <View
                style={[
                  styles.geoV4Circle,
                  {
                    width: token.size,
                    height: token.size,
                    borderRadius: token.size / 2,
                    backgroundColor: color,
                    borderColor,
                  },
                ]}
              />
            ) : null}
            {token.kind === "triangle" ? (
              <View
                style={[
                  styles.geoV4Triangle,
                  {
                    borderLeftWidth: triangleHalf,
                    borderRightWidth: triangleHalf,
                    borderBottomWidth: triangleHeight,
                    borderBottomColor: color,
                  },
                ]}
              />
            ) : null}
          </View>
        );
      })}

      {showCenterLabel ? <CenterLabel secondsLeft={secondsLeft} progress={p} /> : null}
    </View>
  );
}

const FLOW_BUBBLES = [
  { size: 26, a: [-120, 40, 170], y: [-18, -30, -14], o: [0.2, 0.55, 0.25] },
  { size: 34, a: [140, -20, -170], y: [22, 8, 26], o: [0.15, 0.45, 0.18] },
  { size: 18, a: [-70, 90, -150], y: [46, 28, 44], o: [0.1, 0.35, 0.12] },
  { size: 42, a: [170, 60, -120], y: [-40, -24, -44], o: [0.15, 0.3, 0.1] },
  { size: 22, a: [-150, -20, 120], y: [8, -6, 14], o: [0.14, 0.5, 0.2] },
  { size: 30, a: [120, -50, -170], y: [54, 40, 48], o: [0.08, 0.28, 0.1] },
  { size: 20, a: [-30, 130, -90], y: [-52, -34, -56], o: [0.12, 0.33, 0.12] },
  { size: 28, a: [80, -130, 100], y: [30, 12, 26], o: [0.1, 0.38, 0.16] },
];

function FlowGaugeVisual({ progress, secondsLeft: _secondsLeft, animate = true }: ShieldVisualProps) {
  const p = clamp01(progress);
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      drift.setValue(0);
      pulse.setValue(0);
      return () => undefined;
    }
    const move = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 6800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 6800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    move.start();
    breath.start();
    return () => {
      move.stop();
      breath.stop();
    };
  }, [animate, drift, pulse]);

  return (
    <View style={styles.flowWrap}>
      <View style={styles.flowCanvas}>
        {FLOW_BUBBLES.map((bubble, idx) => {
          const tx = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: bubble.a });
          const ty = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: bubble.y });
          const op = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: bubble.o });
          const sc = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
          return (
            <Animated.View
              key={`flow-bubble-${idx}`}
              style={[
                styles.flowBubble,
                {
                  width: bubble.size,
                  height: bubble.size,
                  opacity: op,
                  transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.flowGaugeWrap}>
        <View style={styles.flowGaugeTrack}>
          <View style={[styles.flowGaugeFill, { width: `${Math.round(p * 100)}%` }]} />
        </View>
        <Text style={styles.flowGaugeHint}>{Math.round(p * 100)}%</Text>
      </View>
    </View>
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
  if (normalized === "bubbles") return <BubblesVisual {...props} />;
  if (normalized === "bubblesV2") return <BubblesVisualV2 {...props} />;
  if (normalized === "bubblesV3") return <BubblesVisualV3 {...props} />;
  if (normalized === "flow") return <FlowGaugeVisual {...props} />;
  if (normalized === "geoV1") return <GeometricVisualV1 {...props} />;
  if (normalized === "geoV2") return <GeometricVisualV2 {...props} />;
  if (normalized === "geoV3") return <GeometricVisualV3 {...props} />;
  if (normalized === "geoV4") return <GeometricVisualV4 {...props} />;

  return (
    <ShieldRing
      progress={props.progress}
      secondsLeft={props.secondsLeft}
      phase={phase}
      beatEnabled={!!props.premiumFx}
      size={props.size}
      showCenterLabel={props.showCenterLabel}
      animate={props.animate}
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
  bubbleAmbientGlow: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.12)",
  },
  bubbleBase: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  bubbleA: {
    width: 64,
    height: 64,
    backgroundColor: "rgba(74,222,128,0.24)",
    borderColor: "rgba(74,222,128,0.48)",
  },
  bubbleB: {
    width: 54,
    height: 54,
    backgroundColor: "rgba(52,211,153,0.2)",
    borderColor: "rgba(52,211,153,0.45)",
  },
  bubbleC: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(110,231,183,0.19)",
    borderColor: "rgba(110,231,183,0.38)",
  },
  bubbleD: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(16,185,129,0.24)",
    borderColor: "rgba(16,185,129,0.4)",
  },
  bubbleE: {
    width: 30,
    height: 30,
    backgroundColor: "rgba(187,247,208,0.2)",
    borderColor: "rgba(187,247,208,0.36)",
  },
  bubbleV2Core: {
    position: "absolute",
    width: 94,
    height: 94,
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.2)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.38)",
  },
  bubbleV2A: {
    width: 62,
    height: 62,
    backgroundColor: "rgba(74,222,128,0.25)",
    borderColor: "rgba(74,222,128,0.48)",
  },
  bubbleV2B: {
    width: 58,
    height: 58,
    backgroundColor: "rgba(16,185,129,0.22)",
    borderColor: "rgba(16,185,129,0.46)",
  },
  bubbleV2C: {
    width: 50,
    height: 50,
    backgroundColor: "rgba(110,231,183,0.2)",
    borderColor: "rgba(110,231,183,0.42)",
  },
  bubbleV2D: {
    width: 42,
    height: 42,
    backgroundColor: "rgba(187,247,208,0.2)",
    borderColor: "rgba(187,247,208,0.36)",
  },
  bubbleV2E: {
    width: 34,
    height: 34,
    backgroundColor: "rgba(52,211,153,0.2)",
    borderColor: "rgba(52,211,153,0.4)",
  },
  bubbleV3Core: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(187,247,208,0.34)",
  },
  bubbleV3A: {
    width: 88,
    height: 88,
    borderColor: "rgba(187,247,208,0.36)",
  },
  bubbleV3B: {
    width: 82,
    height: 82,
    borderColor: "rgba(167,243,208,0.34)",
  },
  bubbleV3C: {
    width: 72,
    height: 72,
    borderColor: "rgba(134,239,172,0.34)",
  },
  bubbleV3D: {
    width: 64,
    height: 64,
    borderColor: "rgba(110,231,183,0.32)",
  },
  geoAmbientGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.08)",
  },
  geoTokenWrap: {
    position: "absolute",
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  geoSquare: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(186,230,253,0.35)",
  },
  geoTriangle: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderBottomWidth: 54,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    backgroundColor: "transparent",
    transform: [{ translateY: 3 }],
  },
  geoCircle: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(186,230,253,0.35)",
  },
  geoV2AmbientGlow: {
    position: "absolute",
    width: 228,
    height: 228,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.08)",
  },
  geoV2TokenWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  geoV2Shape: {
    borderWidth: 1,
    borderColor: "rgba(186,230,253,0.34)",
  },
  geoV2Triangle: {
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    backgroundColor: "transparent",
  },
  geoV3AmbientGlow: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.08)",
  },
  geoV3TokenWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  geoV3Square: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 10,
  },
  geoV3Triangle: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    backgroundColor: "transparent",
  },
  geoV3Circle: {
    position: "absolute",
    borderWidth: 1,
  },
  geoV4AmbientGlow: {
    position: "absolute",
    width: 232,
    height: 232,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.08)",
  },
  geoV4TokenWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  geoV4Square: {
    borderWidth: 1,
    borderRadius: 10,
  },
  geoV4Circle: {
    borderWidth: 1,
  },
  geoV4Triangle: {
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    backgroundColor: "transparent",
  },
  flowWrap: {
    alignSelf: "stretch",
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  flowCanvas: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -24,
    bottom: -24,
    alignItems: "center",
    justifyContent: "center",
  },
  flowBubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(74,222,128,0.35)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.4)",
  },
  flowGaugeWrap: {
    width: "92%",
    alignItems: "center",
    gap: 8,
  },
  flowGaugeTrack: {
    width: "100%",
    height: 16,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.2)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    overflow: "hidden",
  },
  flowGaugeFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  flowGaugeHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});

