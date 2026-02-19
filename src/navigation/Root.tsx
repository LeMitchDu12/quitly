import React, { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Tabs from "./Tabs";
import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import QuitDateScreen from "../screens/onboarding/QuitDateScreen";
import ConsumptionScreen from "../screens/onboarding/ConsumptionScreen";
import ProjectionScreen from "../screens/onboarding/ProjectionScreen";
import PaywallScreen from "../screens/onboarding/PaywallScreen";
import SettingsEditScreen from "../screens/SettingsEditScreen";
import QuitlyShieldScreen from "../screens/QuitlyShieldScreen";
import JournalListScreen from "../screens/JournalListScreen";
import JournalCreateScreen from "../screens/JournalCreateScreen";
import JournalDetailScreen from "../screens/JournalDetailScreen";
import RelapseSupportScreen from "../screens/RelapseSupportScreen";
import MonthlyReportScreen from "../screens/MonthlyReportScreen";
import { ensureProfileDefaults, isOnboardingComplete } from "../storage/profile";
import { theme } from "../theme";

export type RootStackParamList = {
  Tabs: undefined;
  Welcome: undefined;
  QuitDate: undefined;
  Consumption: undefined;
  Projection: undefined;
  Paywall: undefined;
  SettingsEdit: undefined;
  QuitlyShield: undefined;
  JournalList: undefined;
  JournalCreate: { linkedToShield?: boolean; linkedToRelapse?: boolean } | undefined;
  JournalDetail: { entryId: string };
  RelapseSupport: { savedAmountLabel?: string } | undefined;
  MonthlyReport: undefined;
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
      <Stack.Screen name="SettingsEdit" component={SettingsEditScreen} />
      <Stack.Screen name="QuitlyShield" component={QuitlyShieldScreen} />
      <Stack.Screen name="JournalList" component={JournalListScreen} />
      <Stack.Screen name="JournalCreate" component={JournalCreateScreen} />
      <Stack.Screen name="JournalDetail" component={JournalDetailScreen} />
      <Stack.Screen name="RelapseSupport" component={RelapseSupportScreen} />
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} />
      <Stack.Screen name="Tabs" component={Tabs} />
    </Stack.Navigator>
  );
}
