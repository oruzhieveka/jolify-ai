// Usage:
//   node scripts/gen-seed-sql.ts        > supabase/seed.sql       (PRODUCTION: curated destinations only)
//   node scripts/gen-seed-sql.ts --demo > supabase/seed.demo.sql  (local/staging only: sample partners + listings)
const DEMO = process.argv.includes('--demo');
import { DESTINATIONS, DEMO_LISTINGS, DEMO_PARTNERS } from '../src/core/seed/index.ts';

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `array[${v.map(q).join(', ')}]::text[]`;
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const out: string[] = [DEMO ? '-- DEMO SEED. Never run against production. Sample partners/listings, is_demo = true.' : '-- PRODUCTION SEED. Curated platform content only (destinations). No users, partners, listings, bookings, payments or reviews.', 'begin;'];
if (!DEMO) for (const d of DESTINATIONS) {
  out.push(`insert into public.destinations (id, name, region, lat, lon, season, duration, difficulty, budget_per_day_usd, tags, activities, description, tips, sort_order, popularity, zone, day_title, details, i18n) values (${[d.id, d.name, d.region, d.lat, d.lon, d.season, d.duration, d.difficulty, d.budgetPerDayUsd, d.tags, d.activities, d.description, d.tips, d.order, d.popularity, d.zone, d.dayTitle, d.details ?? {}, d.i18n ?? {}].map(q).join(', ')}) on conflict (id) do update set name = excluded.name, region = excluded.region, lat = excluded.lat, lon = excluded.lon, season = excluded.season, duration = excluded.duration, difficulty = excluded.difficulty, budget_per_day_usd = excluded.budget_per_day_usd, tags = excluded.tags, activities = excluded.activities, description = excluded.description, tips = excluded.tips, sort_order = excluded.sort_order, popularity = excluded.popularity, zone = excluded.zone, day_title = excluded.day_title, details = excluded.details, i18n = excluded.i18n;`);
}
if (DEMO) for (const p of DEMO_PARTNERS) {
  out.push(`insert into public.partners (id, name, category, city, verified, is_demo) values (${[p.id, p.name, p.category, p.city, p.verified, true].map(q).join(', ')}) on conflict (id) do nothing;`);
}
if (DEMO) for (const l of DEMO_LISTINGS) {
  out.push(`insert into public.listings (id, partner_id, category, title, destination_id, price_usd, price_unit, tags, description, status, is_demo) values (${[l.id, l.partnerId, l.category, l.title, l.destinationId, l.priceUsd, l.unit, l.tags, l.description, 'approved', true].map(q).join(', ')}) on conflict (id) do nothing;`);
}
out.push('commit;');
console.log(out.join('\n'));
