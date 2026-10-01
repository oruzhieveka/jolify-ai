'use client';
import { createContext, useContext } from 'react';
import type { Lang } from '@/core/types';
import { fmt, type Dict } from './dict';

const Ctx = createContext<{ t: Dict; lang: Lang } | null>(null);

/** Gives client components the active dictionary. The server picks the dictionary from the URL locale. */
export function I18nProvider({ t, lang, children }: { t: Dict; lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={{ t, lang }}>{children}</Ctx.Provider>;
}
export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return { ...v, f: fmt };
}
