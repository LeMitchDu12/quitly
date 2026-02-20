import { Platform } from "react-native";
import Constants from "expo-constants";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

const API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
let purchasesReady = false;
let purchasesModulePromise: Promise<typeof import("react-native-purchases") | null> | null = null;

function hasValidApiKey(key: string) {
  const normalized = key.trim();
  if (!normalized) return false;
  if (normalized.includes("REVENUECAT_PUBLIC_IOS_KEY")) return false;
  return true;
}

export function isRevenueCatConfigured() {
  return hasValidApiKey(API_KEY_IOS);
}

export function getLaunchMode(): "expo_go" | "dev_client" | "standalone" | "unknown" {
  const appOwnership = (Constants as { appOwnership?: string }).appOwnership;
  if (appOwnership === "expo") return "expo_go";
  if (appOwnership === "guest") return "dev_client";
  if (appOwnership === "standalone") return "standalone";
  return "unknown";
}

function isUnsupportedRuntimeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("expo go") || lowered.includes("native store is not available");
}

async function ensurePurchasesReady() {
  if (purchasesReady) return true;
  return initPurchases();
}

async function loadPurchasesModule() {
  if (purchasesModulePromise) return purchasesModulePromise;
  purchasesModulePromise = import("react-native-purchases")
    .then((mod) => mod)
    .catch(() => null);
  return purchasesModulePromise;
}

export async function initPurchases(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  if (!hasValidApiKey(API_KEY_IOS)) return false;

  try {
    const purchases = await loadPurchasesModule();
    if (!purchases) return false;
    await purchases.default.configure({ apiKey: API_KEY_IOS });
    purchasesReady = true;
    return true;
  } catch (error) {
    if (isUnsupportedRuntimeError(error)) {
      purchasesReady = false;
      return false;
    }
    throw error;
  }
}

export async function getOfferingPackages(): Promise<PurchasesPackage[]> {
  const ready = await ensurePurchasesReady();
  if (!ready) return [];
  const purchases = await loadPurchasesModule();
  if (!purchases) return [];
  const offerings = await purchases.default.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  return current.availablePackages;
}

export async function purchase(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const ready = await ensurePurchasesReady();
  if (!ready) throw new Error("Purchases unavailable in this runtime.");
  const purchases = await loadPurchasesModule();
  if (!purchases) throw new Error("Purchases unavailable in this runtime.");
  const result = await purchases.default.purchasePackage(pkg);
  return result.customerInfo;
}

export async function restore(): Promise<CustomerInfo> {
  const ready = await ensurePurchasesReady();
  if (!ready) throw new Error("Purchases unavailable in this runtime.");
  const purchases = await loadPurchasesModule();
  if (!purchases) throw new Error("Purchases unavailable in this runtime.");
  return purchases.default.restorePurchases();
}

export async function getPremiumStatusFromStore(): Promise<boolean | null> {
  const ready = await ensurePurchasesReady();
  if (!ready) return null;

  try {
    const purchases = await loadPurchasesModule();
    if (!purchases) return null;
    const info = await purchases.default.getCustomerInfo();
    return isPremium(info);
  } catch (error) {
    if (isUnsupportedRuntimeError(error)) {
      return null;
    }
    throw error;
  }
}

export function isPremium(info: CustomerInfo): boolean {
  // à adapter selon ton entitlement RevenueCat
  return !!info.entitlements.active["premium"];
}
