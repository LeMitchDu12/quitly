import i18n from "../i18n";
import { StorageKeys } from "../storage/keys";
import { setString } from "../storage/mmkv";
import {
  LanguagePref,
  getDeviceLocale,
  readLanguagePreference,
  resolveLanguage,
} from "./preferences";
import { notifyPreferencesChanged } from "./preferencesStore";

export async function applyLanguageFromPrefs() {
  const deviceLocale = getDeviceLocale();
  const languagePref = readLanguagePreference();
  const resolvedLanguage = resolveLanguage(languagePref, deviceLocale);
  try {
    await i18n.changeLanguage(resolvedLanguage);
  } catch {
    await i18n.changeLanguage("en");
  }
  setString(StorageKeys.resolvedLanguage, resolvedLanguage);
  setString(StorageKeys.language, resolvedLanguage);
  notifyPreferencesChanged();
}

export async function setLanguagePreference(preference: LanguagePref) {
  setString(StorageKeys.languagePreference, preference);
  await applyLanguageFromPrefs();
}

