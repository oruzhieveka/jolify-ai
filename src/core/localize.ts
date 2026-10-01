import type { Destination, DestinationDetails, Lang } from './types.ts';

export interface LocalizedDestination {
  name: string; description: string; activities: string[]; tips: string[]; dayTitle: string; details: DestinationDetails;
  /** Fields shown in English because no curated translation exists yet. The UI labels them. */
  fallback: string[];
}

/**
 * Curated content per language with a controlled fallback: missing translations show the English
 * source AND are reported in `fallback`, so pages can label them instead of silently mixing languages.
 */
export function localizeDestination(d: Destination, lang: Lang): LocalizedDestination {
  const fallback: string[] = [];
  const pick = <T,>(key: string, local: T | undefined, en: T, empty: (v: T) => boolean): T => {
    if (lang === 'en') return en;
    if (local !== undefined && !empty(local)) return local;
    if (!empty(en)) fallback.push(key);
    return en;
  };
  const blank = (s: string | undefined) => !s || !s.trim();
  const o = lang === 'en' ? undefined : d.i18n?.[lang];
  const det: DestinationDetails = { ...d.details };
  for (const k of ['howToGetThere', 'history', 'culture', 'safety'] as const) {
    const en = d.details?.[k];
    if (en) det[k] = pick(k, o?.details?.[k], en, blank);
  }
  return {
    name: pick('name', lang === 'en' ? undefined : d.name[lang], d.name.en, blank),
    description: pick('description', lang === 'en' ? undefined : d.description[lang], d.description.en, blank),
    activities: pick('activities', o?.activities, d.activities, (v) => !v?.length),
    tips: pick('tips', o?.tips, d.tips, (v) => !v?.length),
    dayTitle: pick('dayTitle', o?.dayTitle, d.dayTitle, blank),
    details: det,
    fallback,
  };
}

/** Translation completeness for the admin Content page. */
export function translationStatus(d: Destination, lang: 'ru' | 'ky'): { done: number; total: number } {
  const l = localizeDestination(d, lang);
  const total = 2 + (d.activities.length ? 1 : 0) + (d.tips.length ? 1 : 0) + ['howToGetThere', 'history', 'culture', 'safety'].filter((k) => d.details?.[k as 'history']).length;
  return { done: total - l.fallback.filter((f) => f !== 'dayTitle').length, total };
}
