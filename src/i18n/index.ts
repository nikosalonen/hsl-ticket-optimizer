import { en } from "./locales/en.js";
import { fi } from "./locales/fi.js";
import { sv } from "./locales/sv.js";
import type { Locale, TranslationMap } from "./types.js";

const LOCALES: Record<Locale, TranslationMap> = { fi, sv, en };
const STORAGE_KEY = "hsl-locale";
const DEFAULT_LOCALE: Locale = "fi";

let currentLocale: Locale = DEFAULT_LOCALE;
let currentMap: TranslationMap = fi;

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  currentMap = LOCALES[locale];
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore storage errors (quota exceeded, private mode)
  }
  document.documentElement.lang = locale;
  document.dispatchEvent(
    new CustomEvent("locale-change", { detail: { locale } }),
  );
}

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  let text = currentMap[key] ?? fi[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function initI18n(): void {
  const urlParam = new URLSearchParams(window.location.search).get("lang");
  const fromUrl = urlParam && urlParam in LOCALES ? (urlParam as Locale) : null;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors (private mode, restricted access)
  }
  const validSaved: Locale | null =
    saved !== null && saved in LOCALES ? (saved as Locale) : null;
  const locale = fromUrl ?? validSaved ?? DEFAULT_LOCALE;
  currentLocale = locale;
  currentMap = LOCALES[locale];
  document.documentElement.lang = locale;
}

export type { Locale };
