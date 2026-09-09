import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import fr from "./fr.json";
import ht from "./ht.json";

export type Lang = "fr" | "ht";

const dictionaries: Record<Lang, Record<string, string>> = { fr, ht };

const STORAGE_KEY = "achtela.lang";

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "ht") setLangState(stored);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === "ht" ? "ht" : "fr";
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = dictionaries[lang][key] ?? dictionaries.fr[key] ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
        raw,
      );
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/** Picks the field for the active language, e.g. localized(product, "name") */
export function localized<T extends Record<string, unknown>>(
  row: T | null | undefined,
  field: string,
  lang: Lang,
): string {
  if (!row) return "";
  const value = row[`${field}_${lang}`] ?? row[`${field}_fr`];
  return typeof value === "string" ? value : "";
}
