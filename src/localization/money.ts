import { StorageKeys } from "../storage/keys";
import { getString, setString } from "../storage/mmkv";
import {
  CurrencyPref,
  ResolvedCurrency,
  getDeviceLocale,
  readCurrencyPreference,
  resolveCurrency,
} from "./preferences";
import { notifyPreferencesChanged } from "./preferencesStore";

export function getCurrencySymbol(code: ResolvedCurrency) {
  if (code === "EUR") return "€";
  if (code === "GBP") return "£";
  return "$";
}

export function getCurrencyCode(): ResolvedCurrency {
  const preference = readCurrencyPreference();
  if (preference !== "auto") return preference;

  const resolved = getString(StorageKeys.resolvedCurrency);
  if (resolved === "EUR" || resolved === "GBP" || resolved === "USD") return resolved;

  const fallback = resolveCurrency(preference, getDeviceLocale());
  setString(StorageKeys.resolvedCurrency, fallback);
  return fallback;
}

export function formatMoney(
  amount: number,
  opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const locale = getDeviceLocale();
  const currency = getCurrencyCode();
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: opts?.minimumFractionDigits,
      maximumFractionDigits: opts?.maximumFractionDigits,
    }).format(safeAmount);
  } catch {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${safeAmount.toFixed(2)}`;
  }
}

export function applyCurrencyFromPrefs() {
  const deviceLocale = getDeviceLocale();
  const preference = readCurrencyPreference();
  const resolvedCurrency = resolveCurrency(preference, deviceLocale);
  setString(StorageKeys.resolvedCurrency, resolvedCurrency);
  notifyPreferencesChanged();
}

export function setCurrencyPreference(preference: CurrencyPref) {
  setString(StorageKeys.currencyPreference, preference);
  applyCurrencyFromPrefs();
}

