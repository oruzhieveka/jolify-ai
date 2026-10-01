/**
 * Grounded travel assistant (free-form Q&A). Facts come from the catalogue we pass in;
 * the model is told to say "not in our data" instead of guessing. Output is streamed.
 */
import type { Catalog } from '../../core/catalog.ts';
import { UNIT_LABEL } from '../../core/pricing.ts';
import type { Lang } from '../../core/types.ts';
import type { ChatTurn } from './provider.ts';

const LANG_NAME: Record<Lang, string> = { en: 'English', ru: 'Russian', ky: 'Kyrgyz' };

export function chatSystemPrompt(cat: Catalog, lang: Lang): string {
  const dests = cat.destinations.map((d) => `- ${d.id}: ${d.name.en}${d.name.ru ? ' / ' + d.name.ru : ''}${d.name.ky ? ' / ' + d.name.ky : ''}; region ${d.region}; season ${d.season}; time ${d.duration}; ${d.difficulty ?? 'any level'}; tags ${d.tags.join(', ')}; getting there: ${d.details?.howToGetThere ?? 'not in our data'}`);
  const listings = cat.approved().map((l) => `- [${l.id}] ${l.title} (${l.category}) at ${l.destinationId}: $${l.priceUsd} per ${UNIT_LABEL[l.unit] ?? l.unit}${l.isDemo ? ' [SAMPLE, not a real offer]' : ''}`);
  return [
    'You are the JOLIFY AI travel assistant for Kyrgyzstan.',
    `Always reply in ${LANG_NAME[lang]}, even if the user writes in another language, unless they explicitly ask otherwise.`,
    'Hard rules:',
    '1. Businesses, prices, opening hours, availability and bookings: use ONLY the JOLIFY DATA below. If something is not there, say plainly that JOLIFY has no data on it yet. Never invent a hotel, restaurant, guide, phone number, address or price.',
    '2. You cannot make, confirm or pay for bookings. Tell the user to send a booking request from the listing page; the business confirms it.',
    '3. Mention listings by their exact title so the user can find them. Mark SAMPLE listings as samples.',
    '4. General travel knowledge (geography, culture, safety, seasons, road conditions) is allowed, but flag uncertainty and suggest checking locally for anything time-sensitive (border permits, road closures, weather).',
    '5. Keep answers practical and short (under ~250 words) unless the user asks for detail. For full day-by-day plans, suggest the AI planner.',
    '',
    'JOLIFY DATA: DESTINATIONS', ...dests, '',
    'JOLIFY DATA: APPROVED LISTINGS (prices from the database)', ...(listings.length ? listings : ['(none yet: no businesses are listed on the platform)']),
  ].join('\n');
}

/** Normalises client-sent history: only user/assistant turns, trimmed, last 20, must end with a user turn. */
export function sanitizeHistory(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns = raw
    .filter((m): m is ChatTurn => !!m && typeof m === 'object' && ((m as ChatTurn).role === 'user' || (m as ChatTurn).role === 'assistant') && typeof (m as ChatTurn).content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }))
    .filter((m) => m.content.length > 0)
    .slice(-20);
  if (!turns.length || turns[turns.length - 1].role !== 'user') return null;
  while (turns[0]?.role === 'assistant') turns.shift(); // providers require user-first
  return turns;
}

/** Dollar amounts in the answer that match no listing price and no number the user typed. Shown as a caution. */
export function unverifiedPrices(answer: string, cat: Catalog, history: ChatTurn[]): number[] {
  const known = new Set<number>(cat.approved().map((l) => Math.round(l.priceUsd)));
  for (const t of history) for (const m of t.content.matchAll(/\$\s?(\d[\d,]*)/g)) known.add(Number(m[1].replace(/,/g, '')));
  const found = [...answer.matchAll(/\$\s?(\d[\d,]*)/g)].map((m) => Number(m[1].replace(/,/g, '')));
  return [...new Set(found.filter((n) => !known.has(n)))];
}
