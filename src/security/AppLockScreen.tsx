import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { theme } from "../theme";

type Props = {
  isUnlocking: boolean;
  unlockBiometricFirst: (onSuccessStart?: () => void) => Promise<boolean>;
  unlockWithDeviceCode: (onSuccessStart?: () => void) => Promise<boolean>;
  hasFaceRecognition: boolean;
};

type Stage = "biometric" | "code";

export default function AppLockScreen({
  isUnlocking,
  unlockBiometricFirst,
  unlockWithDeviceCode,
  hasFaceRecognition,
}: Props) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [success, setSuccess] = useState(false);
  const [stage, setStage] = useState<Stage>("biometric");
  const breath = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const didAutoAttemptRef = useRef(false);

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

  const onSuccessStart = () => {
    setSuccess(true);
    Animated.timing(successAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const runBiometric = async () => {
    setStage("biometric");
    setFailed(false);
    const start = Date.now();
    const ok = await unlockBiometricFirst(onSuccessStart);
    const elapsed = Date.now() - start;
    if (elapsed < 700) {
      await new Promise((resolve) => setTimeout(resolve, 700 - elapsed));
    }
    if (!ok) {
      setSuccess(false);
      successAnim.setValue(0);
      setFailed(true);
    }
  };

  const runCodeFallback = async () => {
    setStage("code");
    setFailed(false);
    const ok = await unlockWithDeviceCode(onSuccessStart);
    if (!ok) {
      setSuccess(false);
      successAnim.setValue(0);
      setFailed(true);
    }
  };

  useEffect(() => {
    if (didAutoAttemptRef.current) return;
    didAutoAttemptRef.current = true;
    void runBiometric();
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
    if (isUnlocking && stage === "biometric") {
      return hasFaceRecognition ? t("lockSearchingFace") : t("lockSearchingBiometric");
    }
    if (isUnlocking) return t("lockVerifying");
    if (failed) return "";
    return t("lockUnlock");
  }, [failed, hasFaceRecognition, isUnlocking, stage, t]);

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
        <Image source={require("../../assets/quitly_2.png")} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.logo}>Quitly</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {!isUnlocking && !success ? (
          <View style={styles.actions}>
            <Pressable style={styles.retryButton} onPress={runBiometric}>
              <Text style={styles.retryText}>{t("lockRetry")}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {!isUnlocking && !success ? (
        <View style={styles.codeActionWrap}>
          <Pressable style={[styles.retryButton, styles.codeButton]} onPress={runCodeFallback}>
            <Text style={styles.retryText}>{t("lockUseCode")}</Text>
          </Pressable>
        </View>
      ) : null}
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
  logoImage: {
    width: 56,
    height: 56,
    opacity: 0.9,
    marginBottom: 2,
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
  actions: {
    marginTop: 12,
    alignItems: "center",
  },
  retryButton: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  retryText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  codeActionWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: "center",
  },
  codeButton: {
    minWidth: 150,
    alignItems: "center",
  },
});
