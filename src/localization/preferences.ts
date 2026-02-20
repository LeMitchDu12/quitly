import * as Localization from "expo-localization";
import { StorageKeys } from "../storage/keys";
import { getString, setString } from "../storage/mmkv";
import { notifyPreferencesChanged } from "./preferencesStore";

export type ResolvedLanguage = "fr" | "en";
export type ResolvedCurrency = "EUR" | "GBP" | "USD";
export type LanguagePref = "auto" | ResolvedLanguage;
export type CurrencyPref = "auto" | ResolvedCurrency;

const eurLocales = new Set([
  "fr-fr",
  "fr-be",
  "fr-lu",
  "de-de",
  "es-es",
  "it-it",
  "nl-nl",
  "pt-pt",
]);

function normalizeLocale(locale: string) {
  return locale.replace("_", "-");
}

function getCountryCode(locale: string): string | null {
  const normalized = normalizeLocale(locale);
  const parts = normalized.split("-");
  if (parts.length < 2) return null;
  return parts[1]?.toUpperCase() ?? null;
}

export function getDeviceLocale(): string {
  try {
    const locales = Localization.getLocales?.();
    const first = locales?.[0];
    if (first?.languageTag) return first.languageTag;
  } catch {
    // Fallback below.
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
  } catch {
    return "en-US";
  }
}

export function readLanguagePreference(): LanguagePref {
  const raw = getString(StorageKeys.languagePreference);
  if (raw === "fr" || raw === "en" || raw === "auto") return raw;
  return "auto";
}

export function readCurrencyPreference(): CurrencyPref {
  const raw = getString(StorageKeys.currencyPreference);
  if (raw === "EUR" || raw === "GBP" || raw === "USD" || raw === "auto") return raw;
  return "auto";
}

export function readResolvedLanguage(): ResolvedLanguage | null {
  const raw = getString(StorageKeys.resolvedLanguage);
  if (raw === "fr" || raw === "en") return raw;
  return null;
}

export function readResolvedCurrency(): ResolvedCurrency | null {
  const raw = getString(StorageKeys.resolvedCurrency);
  if (raw === "EUR" || raw === "GBP" || raw === "USD") return raw;
  return null;
}

export function resolveLanguage(pref: LanguagePref, deviceLocale: string): ResolvedLanguage {
  if (pref !== "auto") return pref;
  const normalized = normalizeLocale(deviceLocale).toLowerCase();
  return normalized.startsWith("fr") ? "fr" : "en";
}

export function resolveCurrency(pref: CurrencyPref, deviceLocale: string): ResolvedCurrency {
  if (pref !== "auto") return pref;

  const normalized = normalizeLocale(deviceLocale).toLowerCase();
  if (normalized === "en-gb") return "GBP";
  if (normalized === "en-us") return "USD";
  if (eurLocales.has(normalized)) return "EUR";

  const country = getCountryCode(deviceLocale);
  if (country === "GB") return "GBP";
  if (country === "US") return "USD";
  if (country === "FR" || country === "BE" || country === "LU" || country === "DE" || country === "ES" || country === "IT" || country === "NL" || country === "PT") {
    return "EUR";
  }

  if (normalized.startsWith("fr")) return "EUR";
  return "USD";
}

export function persistResolvedPreferences(language: ResolvedLanguage, currency: ResolvedCurrency) {
  setString(StorageKeys.resolvedLanguage, language);
  setString(StorageKeys.resolvedCurrency, currency);
}

export function refreshResolvedPreferences() {
  const deviceLocale = getDeviceLocale();
  const resolvedLanguage = resolveLanguage(readLanguagePreference(), deviceLocale);
  const resolvedCurrency = resolveCurrency(readCurrencyPreference(), deviceLocale);
  persistResolvedPreferences(resolvedLanguage, resolvedCurrency);
  return { resolvedLanguage, resolvedCurrency };
}

export function initPreferencesIfNeeded() {
  const legacyLanguage = getString(StorageKeys.language);
  const currentLanguagePref = getString(StorageKeys.languagePreference);
  if (!currentLanguagePref) {
    if (legacyLanguage === "fr" || legacyLanguage === "en") {
      setString(StorageKeys.languagePreference, legacyLanguage);
    } else {
      setString(StorageKeys.languagePreference, "auto");
    }
  }

  if (!getString(StorageKeys.currencyPreference)) {
    setString(StorageKeys.currencyPreference, "auto");
  }

  refreshResolvedPreferences();
  notifyPreferencesChanged();
}

