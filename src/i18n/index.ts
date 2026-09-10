import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import fr from "./locales/fr.json";
import he from "./locales/he.json";

export const SUPPORTED_LANGUAGES = ["fr", "he"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Languages that render right-to-left. */
export const RTL_LANGUAGES: Language[] = ["he"];

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as Language);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      he: { translation: he },
    },
    fallbackLng: "fr",
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

/** Reflect the active language on <html> (lang + dir) for a11y and RTL. */
function applyDocumentLang(lang: string): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
}

applyDocumentLang(i18n.language);
i18n.on("languageChanged", applyDocumentLang);

export default i18n;
