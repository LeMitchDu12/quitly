import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./Root";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function goToHomeTab() {
  if (!navigationRef.isReady()) return;
  (navigationRef as any).navigate("Tabs", { screen: "Home" });
}
