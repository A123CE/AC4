import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { updateLocale } from '../api';
import zhCN from '../i18n/zh-CN.json';
import en from '../i18n/en.json';

const I18nContext = createContext(null);
const LANG_KEY = 'ac4_lang';
const DICTS = { 'zh-CN': zhCN, en };

function lookup(dict, key) {
  return String(key)
    .split('.')
    .reduce((current, part) => current?.[part], dict);
}

function readStoredLang() {
  try {
    const value = localStorage.getItem(LANG_KEY);
    if (value === 'zh-CN' || value === 'en') return value;
  } catch {
    /* localStorage 不可用 */
  }
  return null;
}

function detectLang(user) {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'zh-CN' || fromUrl === 'en') return fromUrl;
  } catch {
    /* 忽略 URL 解析失败 */
  }

  if (user?.locale === 'zh-CN' || user?.locale === 'en') return user.locale;

  const stored = readStoredLang();
  if (stored) return stored;

  const navigatorLang =
    typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return navigatorLang.toLowerCase().startsWith('en') ? 'en' : 'zh-CN';
}

export function I18nProvider({ children }) {
  const { isLoggedIn, user } = useAuth();
  const [lang, setLangState] = useState(() => detectLang(user));

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback(
    (next) => {
      if (next !== 'zh-CN' && next !== 'en') return;
      setLangState(next);
      try {
        localStorage.setItem(LANG_KEY, next);
      } catch {
        /* 忽略写入失败 */
      }
      if (typeof document !== 'undefined') {
        document.documentElement.lang = next;
      }
      if (isLoggedIn) {
        updateLocale(next).catch(() => {});
      }
    },
    [isLoggedIn]
  );

  const t = useCallback(
    (key, fallback, vars) => {
      const primary = lookup(DICTS[lang], key);
      const secondary = lookup(DICTS['zh-CN'], key);
      const value = primary ?? secondary ?? fallback ?? key;

      if (typeof value !== 'string') return value;
      if (!vars) return value;

      return value.replace(/\{(\w+)\}/g, (match, name) =>
        vars[name] !== undefined ? String(vars[name]) : match
      );
    },
    [lang]
  );

  const formatUnit = useCallback(
    (value, unit) => {
      if (lang !== 'en') return `${value}${unit}`;
      if (unit === '米') return `${value} m`;
      if (unit === '平方米') return `${value} m²`;
      return `${value} ${unit}`;
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, formatUnit }),
    [lang, setLang, t, formatUnit]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export default I18nContext;