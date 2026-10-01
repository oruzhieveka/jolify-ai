import { z } from 'zod';
import type { Itinerary } from './types.ts';
import { Catalog } from './catalog.ts';
import { costOf } from './pricing.ts';

const money = z.number().finite().min(0);
export const ItemSchema = z.object({
  listing_id: z.string().min(1).nullable(),
  name: z.string().trim().min(1),
  category: z.string().min(1),
  cost: money,
  from: z.string().optional(),
  to: z.string().optional(),
  location: z.string().optional(),
});
export const DaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().trim().min(1),
  location: z.string().min(1),
  coordinates: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
  activities: z.array(ItemSchema),
  restaurants: z.array(ItemSchema),
  accommodation: ItemSchema.nullable(),
  transportation: z.array(ItemSchema),
  estimated_cost: money,
  notes: z.array(z.string()),
});
export const ItinerarySchema = z.object({
  schema_version: z.literal('1.0'),
  trip_title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  language: z.enum(['en', 'ru', 'ky']),
  request: z.object({}).passthrough(),
  travelers: z.number().int().min(1).max(50),
  budget_target: z.number().nullable(),
  estimated_budget: z.object({ amount: money, currency: z.literal('USD') }),
  days: z.array(DaySchema).min(1).max(30),
  practical_info: z.array(z.string()),
  generated_by: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export interface ValidationResult { valid: boolean; errors: string[] }

/**
 * Two-stage gate: (1) structural schema, (2) grounding against the catalogue.
 * Any listing that does not exist, is not approved, or whose cost differs from
 * the database price is rejected. Totals must add up. Invalid output is never shown.
 */
export function validateItinerary(cat: Catalog, input: unknown): ValidationResult {
  const parsed = ItinerarySchema.safeParse(input);
  if (!parsed.success) {
    return { valid: false, errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join('.') || 'root'}: ${i.message}`) };
  }
  const it = parsed.data as unknown as Itinerary;
  const e: string[] = [];
  const trav = it.travelers;
  const chk = (x: Itinerary['days'][number]['activities'][number], where: string, needListing: boolean) => {
    if (x.listing_id == null) {
      if (needListing) e.push(`${where}: must reference a listing`);
      else if (x.cost !== 0) e.push(`${where}: unlisted item cannot have a cost`);
      return;
    }
    const l = cat.listing(x.listing_id);
    if (!l) return void e.push(`${where}: unknown listing ${x.listing_id}`);
    if (l.status !== 'approved') e.push(`${where}: listing not approved`);
    if (Math.abs(costOf(l, trav) - x.cost) > 0.5) e.push(`${where}: price does not match database`);
    if (x.name !== l.title) e.push(`${where}: name does not match database`);
  };
  let sum = 0;
  it.days.forEach((d, i) => {
    const w = 'day ' + (i + 1);
    if (d.day !== i + 1) e.push(w + ': numbering');
    const dest = cat.dest(d.location);
    if (!dest) e.push(w + ': unknown location ' + d.location);
    else if (Math.abs(dest.lat - d.coordinates[0]) > 0.05 || Math.abs(dest.lon - d.coordinates[1]) > 0.05) e.push(w + ': coordinates do not match destination');
    d.activities.forEach((x, j) => chk(x, `${w} activities[${j}]`, false));
    d.restaurants.forEach((x, j) => chk(x, `${w} restaurants[${j}]`, true));
    d.transportation.forEach((x, j) => chk(x, `${w} transportation[${j}]`, true));
    if (d.accommodation) chk(d.accommodation, `${w} accommodation`, true);
    const s = [...d.activities, ...d.restaurants, ...d.transportation].reduce((a, x) => a + x.cost, 0) + (d.accommodation?.cost ?? 0);
    if (Math.abs(s - d.estimated_cost) > 1) e.push(w + ': cost sum mismatch');
    sum += d.estimated_cost;
  });
  if (Math.abs(sum - it.estimated_budget.amount) > 1) e.push('total mismatch');
  return { valid: e.length === 0, errors: e };
}
