import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import "./src/i18n"; // init i18n
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import RootNavigator from "./src/navigation/Root"; 
import { theme } from "./src/theme";
import { hydrateStorage } from "./src/storage/mmkv";

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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    hydrateStorage()
      .catch(() => {
        // App can continue with defaults even if hydration fails.
      })
      .finally(() => setIsReady(true));
  }, []);

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
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <RootNavigator />
    </NavigationContainer>
  );
}
