import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

const resources = {
  en: { translation: require("./en.json") },
  fr: { translation: require("./fr.json") },
} as const;

const primaryLocale = Localization.getLocales?.()[0];
const deviceLang = primaryLocale?.languageCode?.toLowerCase() === "fr" ? "fr" : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
