import type { Itinerary, Lang } from './types.ts';
import { ACT, Catalog, STAY, dname, mentionsIn } from './catalog.ts';
import { costOf } from './pricing.ts';
import { buildDay, cheaperStay, ctxFor, fitBudget, item, recalc, titleFor } from './planner.ts';
import { msg } from './messages.ts';

export interface ModifyResult { it: Itinerary; reply: string; changed: number[]; applied: boolean; intent: string }

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

export function dayNum(t: string): number | null {
  const m = t.match(/(?:day|день|дне|дня)\s*(?:№\s*)?(\d{1,2})/) || t.match(/(\d{1,2})\s*(?:-?\s*(?:й|ий|ый|ом|м))?\s*(?:day|день|дне|дня)/) || t.match(/(\d{1,2})\s*-?\s*күн/);
  return m ? +m[1] : null;
}

/**
 * Deterministic modification of an EXISTING itinerary. Never rebuilds from scratch
 * unless asked to add a day. Returns applied=false (and the original) when not understood.
 */
export function modifyTrip(cat: Catalog, orig: Itinerary, message: string, lang: Lang = 'en'): ModifyResult {
  const it = clone(orig);
  const t = ' ' + String(message).toLowerCase() + ' ';
  const trav = it.travelers;
  const ctx = ctxFor(it.request, it.budget_target);
  it.days.forEach((d) => [...d.activities, ...d.restaurants].forEach((x) => x.listing_id && ctx.used.add(x.listing_id)));
  const changed: number[] = [];
  const no = (reply: string, intent: string): ModifyResult => ({ it: orig, reply, changed: [], applied: false, intent });

  const n = dayNum(t);
  const moneyM = t.match(/\$\s?(\d[\d,]*)/) || t.match(/(\d{3,})\s?(?:usd|dollars?|долл|\$)/);
  const target = moneyM ? parseInt(moneyM[1].replace(/,/g, ''), 10) : null;
  const isAdd = /\badd\b|добав|кош|include|plus|extra/.test(t);
  const isRemove = /remove|delete|drop|убери|удали|убрать|алып сал|өчүр/.test(t);
  const isCheap = /cheap|less expensive|budget|save money|lower cost|дешевле|подешевле|эконом|арзан/.test(t);
  const isHorse = /horse|riding|лошад|конн|верхов|ат мин|аттар/.test(t) || /[\s(]ат[\s,.)]/.test(t);
  const isHotel = /hotel|accommodation|stay|guesthouse|lodging|room|отел|гостиниц|жиль|ночлег|мейманкана|түнөк/.test(t);
  const isReplace = /replace|change|swap|different|another|other|замени|поменя|другой|смени|алмаштыр|башка/.test(t);
  const destM = mentionsIn(cat, t).find((d) => d.id !== 'bishkek');
  let reply: string;
  let intent: string;

  if (n !== null && (n < 1 || n > it.days.length)) return no(msg('bad_day', lang, { days: it.days.length }), 'invalid_day');

  if (target && /under|below|max|keep|within|budget|не более|до|уложи|максимум|бюджет|ашпасын|чейин|ичинде/.test(t) && !isAdd) {
    intent = 'budget_cap';
    it.budget_target = target;
    const ok = fitBudget(cat, it, target);
    it.days.forEach((d) => changed.push(d.day));
    reply = ok ? msg('budget_ok', lang, { target, total: it.estimated_budget.amount }) : msg('budget_fail', lang, { total: it.estimated_budget.amount });
  } else if (isCheap && n) {
    intent = 'cheaper_day';
    const i = n - 1;
    const before = it.days[i].estimated_cost;
    const d = it.days[i];
    for (let g = 0; g < 20; g++) { const alt = cheaperStay(cat, d, trav); if (!alt) break; d.accommodation = alt; }
    d.activities = d.activities.filter((a) => a.cost === 0);
    const shared = cat.transport('shared')[0];
    d.transportation = d.transportation.map((x) => {
      const l = cat.listing(x.listing_id);
      return l && l.tags.includes('private') && shared ? item(shared, trav, { from: x.from, to: x.to }) : x;
    });
    d.restaurants = d.restaurants.map((r) => {
      const c = cat.at(d.location, ['restaurant']).map((l) => item(l, trav)).sort((a, b) => a.cost - b.cost)[0];
      return c && c.cost < r.cost ? c : r;
    });
    recalc(it);
    const delta = before - it.days[i].estimated_cost;
    if (delta <= 0) return no(msg('cheaper_none', lang, { day: n }), intent);
    changed.push(n);
    reply = msg('cheaper', lang, { day: n, delta, total: it.estimated_budget.amount });
  } else if (isHorse && !isRemove) {
    intent = 'add_horse';
    const isHorseL = (id: string | null) => !!cat.listing(id)?.tags.includes('horses');
    const has = it.days.find((d) => d.activities.some((a) => isHorseL(a.listing_id)));
    if (has && !n) return no(msg('horse_have', lang, { day: has.day }), intent);
    const order = n ? [it.days[n - 1]] : it.days;
    let placed: { day: number; name: string; cost: number } | null = null;
    for (const d of order) {
      const h = cat.at(d.location, ACT).find((l) => l.tags.includes('horses'));
      if (h) { const x = item(h, trav); d.activities.push(x); placed = { day: d.day, name: x.name, cost: x.cost }; break; }
    }
    if (!placed) {
      const host = cat.approved().find((l) => ACT.includes(l.category) && l.tags.includes('horses'));
      if (!host) return no(msg('horse_none', lang), intent);
      const prev = it.days[Math.max(0, it.days.length - 2)].location;
      const nd = buildDay(cat, host.destinationId, ctx, 'visit', prev);
      if (!nd.activities.some((a) => a.listing_id === host.id)) nd.activities.push(item(host, trav));
      const pos = it.days.length >= 3 ? it.days.length - 1 : it.days.length;
      it.days.splice(pos, 0, nd);
      recalc(it);
      placed = { day: nd.day, name: host.title, cost: costOf(host, trav) };
    }
    if (!it.request.interests.includes('horses')) it.request.interests.push('horses');
    recalc(it);
    changed.push(placed.day);
    reply = msg('horse', lang, { ...placed, total: it.estimated_budget.amount });
  } else if (isHotel && (isReplace || (!isAdd && !isRemove))) {
    intent = 'replace_stay';
    const idx = n ? n - 1 : it.days.findIndex((d) => d.accommodation);
    const d = it.days[idx];
    if (!d || !d.accommodation) return no(msg('hotel_none', lang, { loc: d ? dname(cat.dest(d.location), lang) : '-' }), intent);
    const loc = d.accommodation.location || d.location;
    const curId = d.accommodation.listing_id;
    const alts = cat.at(loc, STAY).filter((l) => l.id !== curId);
    if (!alts.length) return no(msg('hotel_none', lang, { loc: dname(cat.dest(loc), lang) }), intent);
    const wantBetter = /better|nicer|luxury|comfort|лучше|комфорт|жакшы/.test(t);
    const cur = d.accommodation.cost;
    alts.sort((a, b) => isCheap ? a.priceUsd - b.priceUsd : wantBetter ? b.priceUsd - a.priceUsd : Math.abs(costOf(a, trav) - cur) - Math.abs(costOf(b, trav) - cur));
    const old = d.accommodation.name;
    const nw = item(alts[0], trav, { location: loc });
    const targets = n ? [d] : it.days.filter((x) => x.accommodation?.listing_id === curId);
    targets.forEach((x) => { x.accommodation = { ...nw }; changed.push(x.day); });
    recalc(it);
    reply = msg('hotel', lang, { day: d.day, old, new: nw.name, total: it.estimated_budget.amount });
  } else if (isRemove && n) {
    intent = 'remove_day';
    if (it.days.length <= 1) return no(msg('bad_day', lang, { days: 1 }), intent);
    it.days.splice(n - 1, 1);
    if (it.request.days) it.request.days = it.days.length;
    recalc(it);
    reply = msg('rmday', lang, { day: n, days: it.days.length, total: it.estimated_budget.amount });
  } else if (isAdd && (/day|день|дня|күн/.test(t) || destM)) {
    intent = 'add_day';
    const dest = destM ? destM.id : 'issyk-kul';
    let pos = -1;
    it.days.forEach((d, i) => { if (d.location === dest) pos = i + 1; });
    if (pos < 0) {
      const o = cat.dest(dest)!.order;
      pos = it.days.length >= 3 ? it.days.length - 1 : it.days.length;
      for (let i = 1; i < it.days.length - 1; i++) if ((cat.dest(it.days[i].location)?.order ?? 0) > o) { pos = i; break; }
    }
    const prev = it.days[pos - 1]?.location ?? null;
    const nth = it.days.filter((d) => d.location === dest).length;
    it.days.splice(pos, 0, buildDay(cat, dest, ctx, 'visit', prev, nth));
    if (it.request.days) it.request.days = it.days.length;
    recalc(it);
    changed.push(pos + 1);
    reply = msg('addday', lang, { dest: dname(cat.dest(dest), lang), day: pos + 1, days: it.days.length, total: it.estimated_budget.amount });
  } else {
    return no(msg('unknown', lang), 'unknown');
  }
  it.trip_title = titleFor(cat, it, lang);
  it.language = lang;
  return { it, reply, changed, applied: true, intent };
}
