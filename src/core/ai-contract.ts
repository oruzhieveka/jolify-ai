/**
 * Contract between the LLM and the platform.
 * The model only chooses destination ids and listing ids from the catalogue it is given.
 * It NEVER supplies prices, names of businesses, addresses or availability:
 * those are hydrated from the database here, then the result is validated again.
 */
import { z } from 'zod';
import type { Itinerary, ItineraryItem, Lang, TripRequest } from './types.ts';
import { Catalog } from './catalog.ts';
import { costOf } from './pricing.ts';
import { recalc } from './planner.ts';
import { TIPS } from './messages.ts';

export const TOOL_NAME = 'create_itinerary';

export const SkeletonDay = z.object({
  location: z.string(),
  title: z.string().min(1).max(120),
  free_activities: z.array(z.string().min(1).max(160)).max(4).default([]),
  activity_ids: z.array(z.string()).max(3).default([]),
  restaurant_ids: z.array(z.string()).max(3).default([]),
  accommodation_id: z.string().nullable().default(null),
  transport_ids: z.array(z.string()).max(2).default([]),
  notes: z.array(z.string().max(300)).max(4).default([]),
});
export const Skeleton = z.object({
  trip_title: z.string().min(1).max(140),
  summary: z.string().min(1).max(700),
  days: z.array(SkeletonDay).min(1).max(21),
  practical_info: z.array(z.string().max(300)).max(6).default([]),
});
export type SkeletonT = z.infer<typeof Skeleton>;

/** JSON Schema handed to Anthropic as the tool input_schema. Kept in sync with Skeleton by a unit test. */
export const TOOL_INPUT_SCHEMA = {
  type: 'object',
  required: ['trip_title', 'summary', 'days'],
  properties: {
    trip_title: { type: 'string', maxLength: 140 },
    summary: { type: 'string', maxLength: 700, description: 'Must not mention prices or businesses that are not in the catalogue.' },
    practical_info: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    days: {
      type: 'array', minItems: 1, maxItems: 21,
      items: {
        type: 'object',
        required: ['location', 'title'],
        properties: {
          location: { type: 'string', description: 'Destination id from the catalogue' },
          title: { type: 'string' },
          free_activities: { type: 'array', items: { type: 'string' }, maxItems: 4, description: 'Free, self-guided things to do (no business names, no prices)' },
          activity_ids: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'Listing ids (tour/experience/guide) from the catalogue' },
          restaurant_ids: { type: 'array', items: { type: 'string' }, maxItems: 3 },
          accommodation_id: { type: ['string', 'null'] },
          transport_ids: { type: 'array', items: { type: 'string' }, maxItems: 2 },
          notes: { type: 'array', items: { type: 'string' }, maxItems: 4 },
        },
      },
    },
  },
} as const;

export function catalogContext(cat: Catalog, req: TripRequest): string {
  const dests = cat.destinations.map((d) => `${d.id} | ${d.name.en} | ${d.region} | tags:${d.tags.join(',')} | season:${d.season} | zone:${d.zone}`);
  const listings = cat.approved().map((l) => `${l.id} | ${l.category} | ${l.title} | at:${l.destinationId} | $${l.priceUsd} ${l.unit} | tags:${l.tags.join(',')}`);
  return [
    'DESTINATIONS (id | name | region | tags | season | zone):', ...dests, '',
    'APPROVED LISTINGS (id | category | title | destination | price | tags):', ...listings, '',
    `PARSED REQUEST HINTS: ${JSON.stringify({ days: req.days, budget: req.budget, travelers: req.travelers, interests: req.interests, arrival: req.arrival, style: req.style, mentions: req.mentions, month: req.month, startDate: req.startDate })}`,
  ].join('\n');
}

export const SYSTEM_PROMPT = (lang: Lang) => `You are JOLIFY AI, a travel planner for Kyrgyzstan.
Rules you must follow:
- Use ONLY destination ids and listing ids that appear in the catalogue below. Never invent businesses, prices, addresses, phone numbers or availability.
- Do not state prices anywhere; the platform computes them from the database.
- Plan realistic driving distances (mountain roads are slow). Day 1 starts at the arrival city.
- Respect the traveller's budget, interests, group size and dates where given.
- Write titles, summary, notes and free activities in language: ${lang}.
- Always answer by calling the ${TOOL_NAME} tool exactly once.`;

export interface HydrateResult { it: Itinerary | null; errors: string[] }

/** Turn the model's skeleton into a full itinerary using database prices and names. */
export function hydrate(cat: Catalog, raw: unknown, req: TripRequest, lang: Lang, generatedBy: string, budgetTarget?: number | null): HydrateResult {
  const p = Skeleton.safeParse(raw);
  if (!p.success) return { it: null, errors: p.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`) };
  const sk = p.data;
  const errors: string[] = [];
  const trav = Math.max(1, req.travelers || 1);
  const pick = (id: string, where: string, allowed: string[]): ItineraryItem | null => {
    const l = cat.listing(id);
    if (!l) { errors.push(`${where}: unknown listing ${id}`); return null; }
    if (l.status !== 'approved') { errors.push(`${where}: listing ${id} not approved`); return null; }
    if (!allowed.includes(l.category)) { errors.push(`${where}: listing ${id} is a ${l.category}`); return null; }
    return { listing_id: l.id, name: l.title, category: l.category, cost: costOf(l, trav), location: l.destinationId };
  };
  const days = sk.days.map((d, i) => {
    const w = `day ${i + 1}`;
    const dest = cat.dest(d.location);
    if (!dest) errors.push(`${w}: unknown destination ${d.location}`);
    const keep = (x: ItineraryItem | null): x is ItineraryItem => !!x;
    return {
      day: i + 1,
      title: d.title,
      location: d.location,
      coordinates: [dest?.lat ?? 0, dest?.lon ?? 0] as [number, number],
      activities: [
        ...d.free_activities.map((a) => ({ listing_id: null, name: a, category: 'self-guided', cost: 0 })),
        ...d.activity_ids.map((id) => pick(id, w, ['tour', 'experience', 'guide'])).filter(keep),
      ],
      restaurants: d.restaurant_ids.map((id) => pick(id, w, ['restaurant'])).filter(keep),
      accommodation: d.accommodation_id ? pick(d.accommodation_id, w, ['hotel', 'guesthouse', 'yurt']) : null,
      transportation: d.transport_ids.map((id) => pick(id, w, ['transport', 'car'])).filter(keep),
      estimated_cost: 0,
      notes: d.notes,
    };
  });
  if (errors.length) return { it: null, errors };
  const it: Itinerary = {
    schema_version: '1.0', trip_title: sk.trip_title, summary: sk.summary, language: lang, request: req,
    travelers: trav, budget_target: budgetTarget ?? req.budget ?? null, estimated_budget: { amount: 0, currency: 'USD' },
    days, practical_info: sk.practical_info.length ? sk.practical_info : (TIPS[lang] ?? TIPS.en).slice(),
    generated_by: generatedBy, created_at: new Date().toISOString(),
  };
  return { it: recalc(it), errors: [] };
}

/** Compact form of an existing itinerary, sent to the model for modifications. */
export function toSkeleton(it: Itinerary): SkeletonT {
  return {
    trip_title: it.trip_title, summary: it.summary, practical_info: it.practical_info,
    days: it.days.map((d) => ({
      location: d.location, title: d.title,
      free_activities: d.activities.filter((a) => !a.listing_id).map((a) => a.name),
      activity_ids: d.activities.filter((a) => a.listing_id).map((a) => a.listing_id!),
      restaurant_ids: d.restaurants.map((r) => r.listing_id!).filter(Boolean),
      accommodation_id: d.accommodation?.listing_id ?? null,
      transport_ids: d.transportation.map((x) => x.listing_id!).filter(Boolean),
      notes: d.notes,
    })),
  };
}
