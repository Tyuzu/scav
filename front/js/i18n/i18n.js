import { setState, getState } from "../state/state.js";

let translations = {};
let currentLang = "en";

/**
 * Load translations from a JSON file and store in memory.
 */
async function loadTranslations(lang) {
  try {
    const res = await fetch(`/static/i18n/${lang}.json`);
    translations = await res.json();
    currentLang = lang;
    localStorage.setItem("lang", lang);
    setState("lang", lang);
  } catch (err) {
    console.error(`Failed to load translations for "${lang}"`, err);
    translations = {};
  }
}

/**
 * Set the current language and load its translations.
 */
export async function setLanguage(lang) {
  await loadTranslations(lang);
}

/**
 * Detect the preferred language from localStorage or browser.
 */
export function detectLanguage() {
  const saved = localStorage.getItem("lang");
  if (saved) return saved;
  return navigator.language.startsWith("ja") ? "ja" : "en"; // use "ja" for Japanese
}

/**
 * Get the current language code.
 */
export function getCurrentLanguage() {
  return currentLang;
}

/**
 * Translate a key with optional variables and fallback.
 * Supports:
 * - pluralization (key.one / key.other)
 * - {var} interpolation
 * - fallback key if missing
 */
export function t(key, vars = {}, fallback = "") {
  let template = translations[key];

  // Handle pluralization
  const count = vars.count;
  if (typeof count === "number") {
    const pluralKey = `${key}.${count === 1 ? "one" : "other"}`;
    template = translations[pluralKey] || template;
  }

  if (!template) template = fallback || key;

  // Interpolation
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{${k}}`
  );
}

/**
 * Initialize i18n on page load.
 */
export async function initI18n() {
  const lang = detectLanguage();
  await setLanguage(lang);
}
