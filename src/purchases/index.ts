import Purchases, { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { Platform } from "react-native";

const API_KEY_IOS = "REVENUECAT_PUBLIC_IOS_KEY"; // <-- remplace

export async function initPurchases() {
  if (Platform.OS !== "ios") return;
  await Purchases.configure({ apiKey: API_KEY_IOS });
}

export async function getOfferingPackages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  return current.availablePackages;
}

export async function purchase(pkg: PurchasesPackage): Promise<CustomerInfo> {
  return Purchases.purchasePackage(pkg);
}

export async function restore(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export function isPremium(info: CustomerInfo): boolean {
  // à adapter selon ton entitlement RevenueCat
  return !!info.entitlements.active["premium"];
}
