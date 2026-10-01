import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoCatalog, DESTINATIONS, DEMO_LISTINGS } from '../src/core/seed/index.ts';
import { parseRequest } from '../src/core/parse.ts';
import { planTrip } from '../src/core/planner.ts';
import { modifyTrip } from '../src/core/modify.ts';
import { validateItinerary } from '../src/core/validate.ts';
import { costOf } from '../src/core/pricing.ts';
import { Catalog } from '../src/core/catalog.ts';

const cat = demoCatalog();
const REQUIRED = ['ala-archa', 'issyk-kul', 'karakol', 'altyn-arashan', 'jeti-oguz', 'song-kul', 'tash-rabat', 'naryn', 'osh', 'arslanbob', 'sary-chelek', 'skazka', 'barskoon', 'kel-suu', 'chatyr-kul', 'konorchek', 'burana'];

test('seed contains every required location with coordinates inside Kyrgyzstan', () => {
  for (const id of REQUIRED) {
    const d = cat.dest(id);
    assert.ok(d, id);
    assert.ok(d!.lat > 39 && d!.lat < 43.5 && d!.lon > 69 && d!.lon < 80.5, id + ' coords');
    assert.ok(d!.details?.howToGetThere, id + ' howToGetThere');
  }
  assert.equal(new Set(DESTINATIONS.map((d) => d.id)).size, DESTINATIONS.length);
  for (const l of DEMO_LISTINGS) assert.ok(cat.dest(l.destinationId), 'listing dest ' + l.id);
});

test('costOf unit rules', () => {
  assert.equal(costOf({ priceUsd: 50, unit: 'room-night' }, 3), 100);
  assert.equal(costOf({ priceUsd: 90, unit: 'vehicle-day' }, 5), 180);
  assert.equal(costOf({ priceUsd: 40, unit: 'guide-day' }, 6), 40);
  assert.equal(costOf({ priceUsd: 12, unit: 'person-meal' }, 3), 36);
});

test('parser: EN, RU, KY', () => {
  const en = parseRequest(cat, '7 days in July, 2 people, $1500, horses and lakes, Song-Kul please');
  assert.equal(en.days, 7); assert.equal(en.travelers, 2); assert.equal(en.budget, 1500); assert.equal(en.month, 7);
  assert.ok(en.interests.includes('horses') && en.interests.includes('lake'));
  assert.ok(en.mentions.includes('song-kul'));
  const ru = parseRequest(cat, '5 дней, вдвоём, горы и еда, прилетаем в Ош');
  assert.equal(ru.days, 5); assert.equal(ru.travelers, 2); assert.equal(ru.arrival, 'osh');
  assert.ok(ru.interests.includes('mountains') && ru.interests.includes('food'));
  const ky = parseRequest(cat, '4 күн, 3 киши, Ысык-Көл');
  assert.equal(ky.days, 4); assert.equal(ky.travelers, 3); assert.ok(ky.mentions.includes('issyk-kul'));
  assert.equal(parseRequest(cat, 'trip starting 2026-07-12 for a week').startDate, '2026-07-12');
});

for (const [text, lang] of [
  ['7 days, 2 people, $1500, horses and lakes', 'en'],
  ['3 days budget backpacker', 'en'],
  ['10 дней, семья, комфорт, культура', 'ru'],
  ['5 күн, 2 киши, тоолор', 'ky'],
  ['12 days, arrive in Osh, hiking, walnut forest Arslanbob', 'en'],
  ['1 day near Bishkek', 'en'],
] as const) {
  test(`planner output passes validator: ${text}`, () => {
    const it = planTrip(cat, parseRequest(cat, text), lang);
    const v = validateItinerary(cat, it);
    assert.deepEqual(v.errors, []);
    assert.equal(it.language, lang);
    for (const d of it.days) for (const x of [...d.activities, ...d.restaurants, ...d.transportation, ...(d.accommodation ? [d.accommodation] : [])]) {
      if (x.listing_id) assert.equal(cat.approvedListing(x.listing_id)?.title, x.name);
    }
  });
}

test('planner respects a budget when feasible', () => {
  const it = planTrip(cat, parseRequest(cat, '6 days, 2 people, $700, mountains'));
  assert.ok(it.estimated_budget.amount <= 700, String(it.estimated_budget.amount));
});

test('validator catches a planted fake price (tamper test)', () => {
  const it = planTrip(cat, parseRequest(cat, '5 days, 2 people, mountains'));
  const day = it.days.find((d) => d.accommodation)!;
  day.accommodation!.cost = 1; // cheaper than the DB price
  const v = validateItinerary(cat, it);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => e.includes('price does not match database')));
});

test('validator rejects invented listings, unapproved listings and priced free items', () => {
  const base = planTrip(cat, parseRequest(cat, '5 days, mountains'));
  const a = structuredClone(base); a.days[1].restaurants.push({ listing_id: 'l-made-up', name: 'Fake Cafe', category: 'restaurant', cost: 10 });
  assert.ok(validateItinerary(cat, a).errors.some((e) => e.includes('unknown listing')));
  const b = structuredClone(base); b.days[1].activities.push({ listing_id: null, name: 'Mystery tour', category: 'tour', cost: 40 });
  assert.ok(validateItinerary(cat, b).errors.some((e) => e.includes('unlisted item cannot have a cost')));
  const someId = base.days.flatMap((d) => d.restaurants)[0].listing_id!;
  const cat2 = new Catalog(cat.destinations, cat.listings.map((l) => (l.id === someId ? { ...l, status: 'suspended' as const } : l)));
  assert.ok(validateItinerary(cat2, base).errors.some((e) => e.includes('not approved')));
  assert.equal(validateItinerary(cat, { hello: 1 }).valid, false);
});

test('modifier: cheaper day 3, budget cap, horse ride, replace hotel, add/remove day', () => {
  const it = planTrip(cat, parseRequest(cat, '7 days, 2 people, comfort, mountains and culture'));
  const r1 = modifyTrip(cat, it, 'make day 3 less expensive');
  if (r1.applied) {
    assert.ok(r1.it.days[2].estimated_cost < it.days[2].estimated_cost);
    for (const i of [0, 1, 3]) assert.equal(r1.it.days[i].estimated_cost, it.days[i].estimated_cost, 'other days untouched');
  }
  assert.deepEqual(validateItinerary(cat, r1.it).errors, []);

  const r2 = modifyTrip(cat, it, 'keep it under $900');
  assert.equal(r2.intent, 'budget_cap');
  assert.deepEqual(validateItinerary(cat, r2.it).errors, []);

  const r3 = modifyTrip(cat, it, 'add horse riding');
  assert.ok(r3.applied);
  assert.ok(r3.it.days.some((d) => d.activities.some((a) => cat.listing(a.listing_id)?.tags.includes('horses'))));
  assert.deepEqual(validateItinerary(cat, r3.it).errors, []);

  const dayWithStay = it.days.find((d) => d.accommodation && cat.at(d.accommodation.location!, ['hotel', 'guesthouse', 'yurt']).length > 1)!;
  const r4 = modifyTrip(cat, it, `replace the hotel on day ${dayWithStay.day}`);
  assert.ok(r4.applied);
  assert.notEqual(r4.it.days[dayWithStay.day - 1].accommodation!.listing_id, dayWithStay.accommodation!.listing_id);
  assert.deepEqual(validateItinerary(cat, r4.it).errors, []);

  const r5 = modifyTrip(cat, it, 'add a day at Issyk-Kul');
  assert.equal(r5.it.days.length, it.days.length + 1);
  assert.deepEqual(validateItinerary(cat, r5.it).errors, []);

  const r6 = modifyTrip(cat, it, 'remove day 4');
  assert.equal(r6.it.days.length, it.days.length - 1);
  assert.deepEqual(validateItinerary(cat, r6.it).errors, []);

  const r7 = modifyTrip(cat, it, 'make day 40 cheaper');
  assert.equal(r7.applied, false); assert.equal(r7.it, it);
  const r8 = modifyTrip(cat, it, 'sing me a song');
  assert.equal(r8.applied, false);
});

test('modifier works in Russian and Kyrgyz', () => {
  const it = planTrip(cat, parseRequest(cat, '6 дней, вдвоём'), 'ru');
  const r = modifyTrip(cat, it, 'удали 2-й день', 'ru');
  assert.equal(r.it.days.length, it.days.length - 1);
  assert.match(r.reply, /удал/);
  const k = modifyTrip(cat, it, 'ат минүүнү кош', 'ky');
  assert.ok(k.applied);
});

test('modifier does not mutate the input itinerary', () => {
  const it = planTrip(cat, parseRequest(cat, '5 days'));
  const snap = JSON.stringify(it);
  modifyTrip(cat, it, 'keep it under $100');
  assert.equal(JSON.stringify(it), snap);
});
