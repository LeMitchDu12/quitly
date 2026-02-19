import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import i18n from "./src/i18n";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import RootNavigator from "./src/navigation/Root"; 
import { theme } from "./src/theme";
import { getString, hydrateStorage, setString } from "./src/storage/mmkv";
import { StorageKeys } from "./src/storage/keys";
import { goToHomeTab, navigationRef } from "./src/navigation";
import { useAppLock } from "./src/security/useAppLock";
import AppLockScreen from "./src/security/AppLockScreen";

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.background,
    text: theme.colors.textPrimary,
    border: theme.colors.divider,
    primary: theme.colors.primary,
  },
};

export default function App() {
  const {
    isLocked,
    unlockBiometricFirst,
    unlockWithDeviceCode,
    isUnlocking,
    syncFromStorage,
    hasFaceRecognition,
  } = useAppLock();
  const [isReady, setIsReady] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [pendingNotifTarget, setPendingNotifTarget] = useState<string | null>(null);

  useEffect(() => {
    hydrateStorage()
      .then(async () => {
        const savedLanguage = getString(StorageKeys.language);
        if (savedLanguage === "fr" || savedLanguage === "en") {
          await i18n.changeLanguage(savedLanguage);
        }
      })
      .catch(() => {
        // App can continue with defaults even if hydration fails.
      })
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const applyNotificationTarget = (data?: Record<string, unknown>) => {
      const kind = data?.reminderKind;
      const target = data?.target;

      // Passive reminders must never trigger in-app navigation.
      if (kind === "passive") return;

      if (kind === "check" && target === "dailyCheckin") {
        setString(StorageKeys.pendingAction, "dailyCheckin");
        setPendingNotifTarget("dailyCheckin");
      }
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const data = response?.notification.request.content.data as Record<string, unknown> | undefined;
        applyNotificationTarget(data);
      })
      .catch(() => {
        // ignore
      });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      applyNotificationTarget(data);
    });

    return () => sub.remove();
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !navReady) return;
    if (pendingNotifTarget !== "dailyCheckin") return;

    goToHomeTab();
    setPendingNotifTarget(null);
  }, [isReady, navReady, pendingNotifTarget]);

  useEffect(() => {
    if (!isReady) return;
    syncFromStorage();
  }, [isReady, syncFromStorage]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <StatusBar style="light" />
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <NavigationContainer theme={navTheme} ref={navigationRef} onReady={() => setNavReady(true)}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
      {isLocked ? (
        <View style={StyleSheet.absoluteFillObject}>
          <AppLockScreen
            isUnlocking={isUnlocking}
            unlockBiometricFirst={unlockBiometricFirst}
            unlockWithDeviceCode={unlockWithDeviceCode}
            hasFaceRecognition={hasFaceRecognition}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
