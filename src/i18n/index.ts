import { en } from "./locales/en.js";
import { fi } from "./locales/fi.js";
import { sv } from "./locales/sv.js";
import type { Locale, TranslationMap } from "./types.js";

const LOCALES: Record<Locale, TranslationMap> = { fi, sv, en };
const STORAGE_KEY = "hsl-locale";
const DEFAULT_LOCALE: Locale = "fi";

let currentLocale: Locale = DEFAULT_LOCALE;
let currentMap: TranslationMap = fi;

/** Returns the currently active locale. */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Sets the active locale, persists it to localStorage, updates the
 * document `lang` attribute, and dispatches a `locale-change` custom event.
 * @param locale - The locale to activate (`fi`, `en`, or `sv`).
 */
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

/**
 * Translates a key using the current locale's translation map.
 * Falls back to the Finnish map, then returns the raw key if no match is found.
 * @param key - Dot-separated translation key (e.g. `"results.best"`).
 * @param params - Optional interpolation values. Occurrences of `{name}`
 *   in the translated string are replaced with the corresponding value.
 * @returns The resolved (and optionally interpolated) translation string.
 */
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

/**
 * Initialises the i18n system by resolving the active locale.
 * Priority: `?lang=` URL parameter > localStorage > default (`fi`).
 * Sets `document.documentElement.lang` but does **not** dispatch an event.
 */
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
