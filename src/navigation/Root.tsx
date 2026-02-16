import React, { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Tabs from "./Tabs";
import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import QuitDateScreen from "../screens/onboarding/QuitDateScreen";
import ConsumptionScreen from "../screens/onboarding/ConsumptionScreen";
import ProjectionScreen from "../screens/onboarding/ProjectionScreen";
import PaywallScreen from "../screens/onboarding/PaywallScreen";
import { ensureProfileDefaults, isOnboardingComplete } from "../storage/profile";
import { theme } from "../theme";

export type RootStackParamList = {
  Tabs: undefined;
  Welcome: undefined;
  QuitDate: undefined;
  Consumption: undefined;
  Projection: undefined;
  Paywall: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const done = useMemo(() => {
    ensureProfileDefaults();
    return isOnboardingComplete();
  }, []);

  return (
    <Stack.Navigator
      initialRouteName={done ? "Tabs" : "Welcome"}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="QuitDate" component={QuitDateScreen} />
      <Stack.Screen name="Consumption" component={ConsumptionScreen} />
      <Stack.Screen name="Projection" component={ProjectionScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
      <Stack.Screen name="Tabs" component={Tabs} />
    </Stack.Navigator>
  );
}
