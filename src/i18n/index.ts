import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { ar } from './ar';
import type { Lang } from '@/types';

const STORAGE_KEY = 'zid.lang';

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'ar') return v;
  } catch {
    /* storage blocked */
  }
  return typeof navigator !== 'undefined' && navigator.language?.startsWith('ar') ? 'ar' : 'en';
}

/** Reflect the language on <html> so Tailwind logical utilities and fonts mirror for RTL. */
function applyDocument(lang: Lang) {
  if (typeof document === 'undefined') return; // tests / non-browser
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

const initial = readStored();
applyDocument(initial);

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function getLang(): Lang {
  return (i18n.language as Lang) ?? 'en';
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage blocked */
  }
  applyDocument(lang);
  void i18n.changeLanguage(lang);
}

/** Locale for Intl formatting. Arabic uses Latin digits to keep numbers readable next to units. */
export function intlLocale(lang: Lang = getLang()) {
  return lang === 'ar' ? 'ar-TN-u-nu-latn' : 'en-GB';
}

export default i18n;
