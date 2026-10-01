import type { Interest, TripRequest } from './types.ts';
import { Catalog, mentionsIn } from './catalog.ts';

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const INTERESTS: Record<Interest, string[]> = {
  mountains: ['mountain', 'peak', 'alpine', 'гор', 'тоо'],
  horses: ['horse', 'riding', 'ride', 'лошад', 'конн', 'верхов', 'ат мин', 'аттар'],
  food: ['food', 'cuisine', 'eat', 'dish', 'еда', 'кухн', 'гастро', 'тамак'],
  photo: ['photo', 'camera', 'фото', 'сүрөт'],
  lake: ['lake', 'beach', 'swim', 'issyk', 'озер', 'пляж', 'көл'],
  culture: ['culture', 'history', 'museum', 'heritage', 'культур', 'истор', 'маданият', 'тарых'],
  adventure: ['adventure', 'canyon', 'offroad', 'приключ', 'каньон', 'капчыгай'],
  relax: ['relax', 'spa', 'hot spring', 'chill', 'отдых', 'расслаб', 'эс ал'],
  nomad: ['yurt', 'nomad', 'shepherd', 'юрт', 'кочев', 'боз үй', 'көчмөн'],
  hiking: ['hike', 'hiking', 'trek', 'walk', 'поход', 'трек', 'жөө'],
};

const MONTHS: [RegExp, number][] = [
  [/ jan|январ|январь/, 1], [/ feb|феврал/, 2], [/ mar(ch)? |март/, 3], [/ apr|апрел/, 4],
  [/ may | мае | мая /, 5], [/ jun|июн|июнь/, 6], [/ jul|июл/, 7], [/ aug|август/, 8],
  [/ sep|сентябр/, 9], [/ oct|октябр/, 10], [/ nov|ноябр/, 11], [/ dec|декабр/, 12],
];

export interface ParsePrefs { interests?: Interest[] }

/**
 * Deterministic multilingual request understanding (EN/RU/KY).
 * Used by the demo provider and as the hint layer passed to the LLM provider.
 */
export function parseRequest(cat: Catalog, text: string, prefs?: ParsePrefs): TripRequest {
  const t = ' ' + String(text || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
  const r: TripRequest = {
    raw: String(text || ''), days: null, budget: null, travelers: 1, interests: [], arrival: 'bishkek',
    style: 'balanced', mentions: [], month: null, startDate: null,
  };

  let m = t.match(/(\d{1,2})\s*-?\s*(?:days?|nights?|дн|день|дня|дней|ноч|күн)/);
  if (m) r.days = +m[1];
  else if (/\b(a|one) week\b|недел|жума/.test(t)) r.days = 7;
  else if (/weekend|выходн/.test(t)) r.days = 2;
  if (m && /night|ноч/.test(m[0])) r.days = +m[1] + 1;
  if (r.days !== null) r.days = clamp(r.days, 1, 21);

  m = t.match(/\$\s?(\d[\d,.]*)/) || t.match(/(\d[\d,]*)\s?(?:usd|dollars?|долл|доллар|\$)/);
  if (m) r.budget = parseInt(m[1].replace(/[,.]/g, ''), 10) || null;

  m = t.match(/(\d+)\s*(?:people|persons|travell?ers|adults|of us|guests|человек|чел|взросл|киши|адам)/);
  if (m) r.travelers = clamp(+m[1], 1, 20);
  else if (/couple|two of us|my (wife|husband|partner|girlfriend|boyfriend)|вдвоём|вдвоем|с женой|с мужем|экөөбүз/.test(t)) r.travelers = 2;
  else if (/family|семь|үй-бүлө/.test(t)) r.travelers = 4;

  for (const [k, ws] of Object.entries(INTERESTS) as [Interest, string[]][]) if (ws.some((w) => t.includes(w))) r.interests.push(k);
  if (/[\s(]ат[\s,.)]/.test(t) && !r.interests.includes('horses')) r.interests.push('horses');

  if (/(arriv|land|fly|прилет|прилёт|учуп)[^.]*[\s(](osh|ош)[\s,.]/.test(t)) r.arrival = 'osh';
  else if (/(start|from|begin|из|начать)[^.]{0,12}[\s(](osh|ош)[\s,.]/.test(t)) r.arrival = 'osh';

  if (/budget|cheap|backpack|бюджетн|дешев|арзан/.test(t) && !r.budget) r.style = 'budget';
  if (/luxury|comfort|premium|люкс|комфорт/.test(t)) r.style = 'comfort';

  for (const d of mentionsIn(cat, t)) if (d.id !== 'bishkek' && !r.mentions.includes(d.id)) r.mentions.push(d.id);
  for (const [re, n] of MONTHS) if (re.test(t)) r.month = n;
  const iso = t.match(/(20\d\d-\d\d-\d\d)/);
  if (iso && !Number.isNaN(Date.parse(iso[1]))) { r.startDate = iso[1]; r.month = +iso[1].slice(5, 7); }

  if (!r.interests.length && prefs?.interests?.length) r.interests = [...prefs.interests];
  if (!r.interests.length) r.interests = ['mountains', 'culture'];
  if (r.budget && r.days) {
    const ppd = r.budget / r.travelers / r.days;
    if (ppd < 60) r.style = 'budget';
    else if (ppd > 180) r.style = 'comfort';
  }
  return r;
}
