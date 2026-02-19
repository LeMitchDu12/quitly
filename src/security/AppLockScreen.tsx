import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { theme } from "../theme";

type Props = {
  isUnlocking: boolean;
  unlock: (onSuccessStart?: () => void) => Promise<boolean>;
};

export default function AppLockScreen({ isUnlocking, unlock }: Props) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [success, setSuccess] = useState(false);
  const breath = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const tryUnlock = async () => {
    setFailed(false);
    const ok = await unlock(() => {
      setSuccess(true);
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
    if (!ok) {
      setSuccess(false);
      successAnim.setValue(0);
      setFailed(true);
    }
  };

  useEffect(() => {
    void tryUnlock();
    // run once on lock appearance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const haloOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.25],
  });

  const haloScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.02],
  });

  const successOpacity = successAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.22],
  });

  const successScale = successAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.02, 1],
  });

  const subtitle = useMemo(() => {
    if (isUnlocking) return t("lockVerifying");
    if (failed) return t("lockRetry");
    return t("lockUnlock");
  }, [failed, isUnlocking, t]);

  return (
    <View style={styles.root}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="45%" r="70%">
            <Stop offset="0%" stopColor="#151922" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0F1115" stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      <Animated.View style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
      <Animated.View style={[styles.haloSuccess, { opacity: successOpacity, transform: [{ scale: successScale }] }]} />

      <View style={styles.center}>
        <Text style={styles.logo}>Quitly</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {!isUnlocking && !success && (
          <Pressable style={styles.retryButton} onPress={tryUnlock}>
            <Text style={styles.retryText}>{t("lockUnlock")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F1115",
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: "#4ADE80",
  },
  haloSuccess: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: "#4ADE80",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logo: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  retryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  retryText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
});
