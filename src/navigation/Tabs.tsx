import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import HomeScreen from "../screens/HomeScreen";
import ProgressScreen from "../screens/ProgressScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { theme } from "../theme";
import { useTranslation } from "react-i18next";

export type TabsParamList = {
  Home: undefined;
  Progress: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabsParamList>();

export default function Tabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.divider,
        },
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "ellipse";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Progress") {
            iconName = focused ? "stats-chart" : "stats-chart-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("home") }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ title: t("progress") }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings") }} />
    </Tab.Navigator>
  );
}
