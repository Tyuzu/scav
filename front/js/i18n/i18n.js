import { setState } from "../state/state.js";

let translations = {};
let currentLang = "en";

const SUPPORTED_LANGS = ["en", "ja"];
const FALLBACK_LANG = "en";

/**
 * Load translations from a JSON file and store in memory.
 */
async function loadTranslations(lang) {
  try {
    const res = await fetch(`/static/i18n/${lang}.json`);
    if (!res.ok) {
      throw new Error(`Failed to load ${lang} translations: ${res.status}`);
    }
    translations = await res.json();
    currentLang = lang;
    localStorage.setItem("lang", lang);
    setState("lang", lang);
  } catch (err) {
    console.error(`Failed to load translations for "${lang}"`, err);
    
    // Fallback to default language if not already trying it
    if (lang !== FALLBACK_LANG) {
      console.warn(`Falling back to ${FALLBACK_LANG}`);
      try {
        const res = await fetch(`/static/i18n/${FALLBACK_LANG}.json`);
        if (!res.ok) {
throw new Error(`Cannot load fallback language`);
}
        translations = await res.json();
        currentLang = FALLBACK_LANG;
        setState("lang", FALLBACK_LANG);
      } catch (fallbackErr) {
        console.error(`Fallback language load failed:`, fallbackErr);
        translations = {}; // Empty translations if all fail
      }
    } else {
      translations = {}; // Empty translations if fallback fails
    }
  }
}

/**
 * Set the current language and load its translations.
 */
export async function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    console.warn(`Language "${lang}" not supported. Using ${FALLBACK_LANG}`);
    lang = FALLBACK_LANG;
  }
  await loadTranslations(lang);
}

/**
 * Detect the preferred language from localStorage or browser.
 */
export function detectLanguage() {
  const saved = localStorage.getItem("lang");
  if (saved && SUPPORTED_LANGS.includes(saved)) {
return saved;
}
  
  // Browser language chain with fallback
  const browseLangs = navigator.languages || [navigator.language];
  for (const browserLang of browseLangs) {
    const base = browserLang.split("-")[0];
    if (SUPPORTED_LANGS.includes(base)) {
return base;
}
    if (SUPPORTED_LANGS.includes(browserLang)) {
return browserLang;
}
  }
  
  return FALLBACK_LANG;
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

  if (!template) {
    console.warn(`Missing translation: ${key}`);
    template = fallback || key;
  }

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
