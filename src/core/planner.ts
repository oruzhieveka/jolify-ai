import type { Itinerary, ItineraryDay, ItineraryItem, Lang, Listing, TripRequest } from './types.ts';
import { ACT, Catalog, STAY, dname } from './catalog.ts';
import { costOf } from './pricing.ts';
import { km } from './geo.ts';
import { clamp } from './parse.ts';
import { TIPS } from './messages.ts';

export interface PlanCtx { req: TripRequest; trav: number; ppd: number; used: Set<string> }

export function ctxFor(req: TripRequest, budgetTarget?: number | null): PlanCtx {
  const days = req.days || 5;
  const trav = req.travelers || 1;
  const b = budgetTarget || req.budget;
  const ppd = b ? b / trav / days : req.style === 'budget' ? 60 : req.style === 'comfort' ? 200 : 110;
  return { req, trav, ppd, used: new Set() };
}

export const item = (l: Listing, trav: number, extra: Partial<ItineraryItem> = {}): ItineraryItem => ({
  listing_id: l.id, name: l.title, category: l.category, cost: costOf(l, trav), ...extra,
});

const score = (tags: string[], interests: string[]) => tags.filter((x) => interests.includes(x)).length;

export function chooseStay(cat: Catalog, destId: string, ctx: PlanCtx, exclude: string[] = []): ItineraryItem | null {
  const loc = cat.nearestWith(destId, STAY);
  if (!loc) return null;
  const opts = cat.at(loc, STAY).filter((l) => !exclude.includes(l.id)).sort((a, b) => costOf(a, ctx.trav) - costOf(b, ctx.trav));
  if (!opts.length) return null;
  const target = ctx.ppd * 0.42 * ctx.trav;
  const fit = opts.filter((l) => costOf(l, ctx.trav) <= target);
  let pick = fit.length ? fit[fit.length - 1] : opts[0];
  if (ctx.req.style === 'budget') pick = opts[0];
  return item(pick, ctx.trav, { location: loc });
}

export function transportFor(cat: Catalog, ctx: PlanCtx): Listing | null {
  const drv = cat.transport('private')[0];
  const sh = cat.transport('shared')[0];
  if (drv && ctx.req.style !== 'budget' && costOf(drv, ctx.trav) / ctx.trav <= ctx.ppd * 0.4) return drv;
  return sh ?? drv ?? null;
}

export type DayKind = 'arrive' | 'visit' | 'return';

export function buildDay(cat: Catalog, destId: string, ctx: PlanCtx, kind: DayKind, prevId: string | null, nth = 0): ItineraryDay {
  const d = cat.dest(destId);
  if (!d) throw new Error('Unknown destination ' + destId);
  const day: ItineraryDay = {
    day: 0, title: '', location: destId, coordinates: [d.lat, d.lon], activities: [], restaurants: [],
    accommodation: null, transportation: [], estimated_cost: 0, notes: [],
  };
  day.title = kind === 'arrive' ? 'Arrive in ' + d.name.en : kind === 'return' ? 'Back to ' + d.name.en + ' and departure' : nth > 0 ? d.dayTitle + ', day ' + (nth + 1) : d.dayTitle;

  const acts = d.activities.slice();
  if (acts.length) {
    const off = nth % acts.length;
    acts.slice(off).concat(acts.slice(0, off)).slice(0, kind === 'visit' ? 2 : 1)
      .forEach((a) => day.activities.push({ name: a, listing_id: null, category: 'self-guided', cost: 0 }));
  }

  if (kind !== 'return') {
    const paid = cat.at(destId, ACT).filter((l) => !ctx.used.has(l.id))
      .map((l) => ({ l, s: score(l.tags, ctx.req.interests) }))
      .sort((a, b) => b.s - a.s || a.l.priceUsd - b.l.priceUsd);
    const p = paid[0];
    if (p && (p.s > 0 || kind === 'visit') && costOf(p.l, ctx.trav) / ctx.trav <= Math.max(ctx.ppd * 0.6, 25)) {
      day.activities.push(item(p.l, ctx.trav));
      ctx.used.add(p.l.id);
    }
    day.accommodation = chooseStay(cat, destId, ctx);
    if (day.accommodation && day.accommodation.location !== destId) {
      day.notes.push('Overnight in ' + dname(cat.dest(day.accommodation.location), 'en') + ' (nearest listed stay).');
    }
  }

  const stayL = day.accommodation ? cat.listing(day.accommodation.listing_id) : undefined;
  if (stayL?.tags.includes('meals')) day.notes.push('Dinner and breakfast included at your stay.');
  else {
    const rs = cat.at(destId, ['restaurant'])
      .map((l) => ({ l, s: (ctx.req.interests.includes('food') && l.tags.includes('food') ? 1 : 0) + (ctx.used.has(l.id) ? -2 : 0) + (ctx.req.style === 'budget' && l.tags.includes('budget') ? 1 : 0) }))
      .sort((a, b) => b.s - a.s || (ctx.req.style === 'budget' ? a.l.priceUsd - b.l.priceUsd : b.l.priceUsd - a.l.priceUsd));
    if (rs[0]) { day.restaurants.push(item(rs[0].l, ctx.trav)); ctx.used.add(rs[0].l.id); }
    else day.notes.push('Meals at local cafes (not yet listed, not included in estimate).');
  }

  if (kind === 'arrive') {
    const tr = cat.transport('transfer').find((l) => l.destinationId === destId);
    if (tr) day.transportation.push(item(tr, ctx.trav, { from: 'Airport', to: d.name.en }));
  } else if (prevId !== destId || kind === 'return' || d.id === 'ala-archa') {
    const tl = transportFor(cat, ctx);
    const prev = cat.dest(prevId || destId) ?? d;
    if (tl) day.transportation.push(item(tl, ctx.trav, { from: prev.name.en, to: d.name.en }));
    const dist = prevId ? Math.round(km(prev, d) * 1.35) : 0;
    if (dist > 250) day.notes.push(`Long transfer: about ${dist} km by road (estimate).`);
  }
  return day;
}

export function recalc(it: Itinerary): Itinerary {
  let tot = 0;
  it.days.forEach((d, i) => {
    d.day = i + 1;
    const s = [...d.activities, ...d.restaurants, ...d.transportation].reduce((a, x) => a + (x.cost || 0), 0) + (d.accommodation ? d.accommodation.cost : 0);
    d.estimated_cost = Math.round(s);
    tot += d.estimated_cost;
  });
  it.estimated_budget = { amount: Math.round(tot), currency: 'USD' };
  it.updated_at = new Date().toISOString();
  return it;
}

export function selectStops(cat: Catalog, req: TripRequest, M: number): string[] {
  const days = req.days ?? 5;
  const pool = cat.destinations.filter((d) => {
    if (d.zone === 'hub') return false;
    if (req.mentions.includes(d.id)) return true;
    if (d.zone === 'south') return req.arrival === 'osh' || days >= 12;
    if (d.zone === 'remote') return days >= 8 || (req.style !== 'budget' && days >= 7 && d.id === 'tash-rabat');
    if (d.zone === 'west') return days >= 8;
    if (req.arrival === 'osh' && days < 9) return ['suusamyr', 'ala-archa', 'burana'].includes(d.id);
    return true;
  });
  const st = cat.dest(req.arrival === 'osh' ? 'osh' : 'bishkek')!;
  const sc = pool.filter((d) => d.id !== st.id || M >= 6)
    .map((d) => ({ d, s: 3 * score(d.tags, req.interests) + d.popularity + (req.mentions.includes(d.id) ? 20 : 0) - (days <= 4 ? km(st, d) / 80 : 0) }))
    .sort((a, b) => b.s - a.s);
  const out: string[] = [];
  for (const x of sc) {
    if (out.length >= M) break;
    out.push(x.d.id);
    if (x.d.id === 'song-kul' && (req.interests.includes('horses') || req.interests.includes('nomad')) && M >= 5 && out.length < M) out.push('song-kul');
  }
  let i = 0;
  while (out.length < M && sc.length) { out.push(sc[i % sc.length].d.id); i++; }
  return out.sort((a, b) => cat.dest(a)!.order - cat.dest(b)!.order);
}

function plural(n: number, lang: Lang) {
  if (lang === 'ru') return `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'день' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'дня' : 'дней'}`;
  if (lang === 'ky') return `${n} күн`;
  return `${n} days`;
}

export function titleFor(cat: Catalog, it: Itinerary, lang: Lang) {
  const stops = [...new Set(it.days.map((d) => d.location))].filter((id) => id !== 'bishkek').slice(0, 3).map((id) => dname(cat.dest(id), lang));
  const head = stops.length ? stops.join(' · ') : dname(cat.dest(it.days[0]?.location), lang);
  return `${head}: ${plural(it.days.length, lang)}`;
}

export function summaryFor(cat: Catalog, it: Itinerary, lang: Lang) {
  const start = dname(cat.dest(it.days[0]?.location), lang);
  const ints = it.request.interests.join(', ');
  if (lang === 'ru') return `Маршрут из ${start}: ${ints}. Цены и места взяты только из каталога партнёров; питание в непредставленных кафе в смету не входит.`;
  if (lang === 'ky') return `${start} шаарынан башталган маршрут: ${ints}. Баалар жана жайлар өнөктөштөрдүн каталогунан гана алынды.`;
  return `A route from ${start} built around ${ints}. Prices and places come only from partner listings on the platform; meals at unlisted cafes are not in the estimate.`;
}

export function cheaperStay(cat: Catalog, day: ItineraryDay, trav: number): ItineraryItem | null {
  if (!day.accommodation) return null;
  const loc = day.accommodation.location || day.location;
  const cur = day.accommodation.cost;
  return cat.at(loc, STAY).map((l) => item(l, trav, { location: loc })).filter((x) => x.cost < cur).sort((a, b) => b.cost - a.cost)[0] ?? null;
}

/** Greedy downgrade until the total fits. Returns true when it fits. */
export function fitBudget(cat: Catalog, it: Itinerary, target: number, onlyDay: number | null = null): boolean {
  const trav = it.travelers;
  const shared = cat.transport('shared')[0];
  let guard = 80;
  while (guard-- && it.estimated_budget.amount > target) {
    const moves: { save: number; go: () => void }[] = [];
    it.days.forEach((d, i) => {
      if (onlyDay !== null && i !== onlyDay) return;
      const alt = cheaperStay(cat, d, trav);
      if (alt && d.accommodation) moves.push({ save: d.accommodation.cost - alt.cost, go: () => { d.accommodation = alt; } });
      d.transportation.forEach((t, j) => {
        const tl = cat.listing(t.listing_id);
        if (shared && tl && tl.tags.includes('private')) {
          const n = item(shared, trav, { from: t.from, to: t.to });
          if (n.cost < t.cost) moves.push({ save: t.cost - n.cost, go: () => { d.transportation[j] = n; } });
        }
      });
      d.activities.forEach((a, j) => { if (a.cost > 0) moves.push({ save: a.cost * 0.8, go: () => { d.activities.splice(j, 1); } }); });
      d.restaurants.forEach((r, j) => {
        const cheaper = cat.at(d.location, ['restaurant']).map((l) => item(l, trav)).filter((x) => x.cost < r.cost).sort((a, b) => a.cost - b.cost)[0];
        if (cheaper) moves.push({ save: r.cost - cheaper.cost, go: () => { d.restaurants[j] = cheaper; } });
        else moves.push({ save: r.cost * 0.5, go: () => { d.restaurants.splice(j, 1); d.notes.push('Meals at local cafes (not included in estimate).'); } });
      });
    });
    if (!moves.length) break;
    moves.sort((a, b) => b.save - a.save)[0].go();
    recalc(it);
  }
  return it.estimated_budget.amount <= target;
}

/** Rules-based planner. Used as the demo provider and as the fallback when the LLM fails validation. */
export function planTrip(cat: Catalog, req: TripRequest, lang: Lang = 'en'): Itinerary {
  const days = clamp(req.days || 5, 1, 21);
  req.days = days;
  const start = req.arrival === 'osh' ? 'osh' : 'bishkek';
  const ctx = ctxFor(req);
  const M = days >= 3 ? days - 2 : days - 1;
  const stops = selectStops(cat, req, M);
  const seq: { id: string; kind: DayKind }[] = [{ id: start, kind: 'arrive' }];
  stops.forEach((s) => seq.push({ id: s, kind: 'visit' }));
  if (days >= 3) seq.push({ id: 'bishkek', kind: 'return' });
  const it: Itinerary = {
    schema_version: '1.0', trip_title: '', summary: '', language: lang, request: req, travelers: ctx.trav,
    budget_target: req.budget || null, estimated_budget: { amount: 0, currency: 'USD' }, days: [],
    practical_info: (TIPS[lang] ?? TIPS.en).slice(), generated_by: 'rules-v2', created_at: new Date().toISOString(),
  };
  const seen: Record<string, number> = {};
  let prev: string | null = null;
  for (const s of seq) {
    const nth = s.kind === 'visit' ? (seen[s.id] = (seen[s.id] ?? -1) + 1) : 0;
    it.days.push(buildDay(cat, s.id, ctx, s.kind, prev, nth));
    prev = s.id;
  }
  recalc(it);
  if (req.budget && it.estimated_budget.amount > req.budget) fitBudget(cat, it, req.budget);
  it.trip_title = titleFor(cat, it, lang);
  it.summary = summaryFor(cat, it, lang);
  return it;
}
