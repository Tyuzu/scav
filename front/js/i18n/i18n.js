import { setState } from "../state/state.js";

let translations = {};
let currentLang = "en";
let activeRequest = 0;

const cache = new Map();

const SUPPORTED_LANGS = ["en", "es", "fr", "hi", "ar", "ja"];
const FALLBACK_LANG = "en";

async function fetchTranslations(lang) {
  const res = await fetch(`/static/i18n/${lang}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load ${lang}`);
  }
  return res.json();
}

async function loadTranslations(lang) {
  const requestId = ++activeRequest;

  try {
    if (!cache.has(lang)) {
      cache.set(lang, await fetchTranslations(lang));
    }

    if (requestId !== activeRequest) {
      return;
    }
    translations = cache.get(lang);
    currentLang = lang;

    localStorage.setItem("lang", lang);
    setState("lang", lang);

    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    if (requestId !== activeRequest) {
      return;
    }

    if (lang !== FALLBACK_LANG) {
      return loadTranslations(FALLBACK_LANG);
    }

    translations = {};
  }
}

export async function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    lang = FALLBACK_LANG;
  }
  await loadTranslations(lang);
}

export function detectLanguage() {
  const saved = localStorage.getItem("lang");
  if (saved && SUPPORTED_LANGS.includes(saved)) {
    return saved;
  }

  const langs = navigator.languages || [navigator.language];

  for (const l of langs) {
    if (SUPPORTED_LANGS.includes(l)) {
      return l;
    }
    const base = l.split("-")[0];
    if (SUPPORTED_LANGS.includes(base)) {
      return base;
    }
  }

  return FALLBACK_LANG;
}

export function getCurrentLanguage() {
  return currentLang;
}

function getNested(obj, path) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

export function t(key, vars = {}, fallback = "") {
  let template = getNested(translations, key);

  if (typeof vars.count === "number") {
    const rule = new Intl.PluralRules(currentLang).select(vars.count);
    const plural = getNested(translations, `${key}.${rule}`);
    if (plural) {
      template = plural;
    }
  }

  if (!template) {
    if (import.meta.env.DEV) {
      console.warn(`Missing translation: ${key}`);
    }
    template = fallback || key;
  }

  return String(template).replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? vars[k] : `{${k}}`
  );
}

export async function initI18n() {
  await setLanguage(detectLanguage());
}