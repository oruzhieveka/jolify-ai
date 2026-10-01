import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { directionsUrl, yandexDirectionsUrl, twoGisDirectionsUrl } from '../src/core/geo.ts';
import { mapProvider, mapStyle, mapboxDarkStyle } from '../src/lib/map-provider.ts';
import { assertEnv } from '../src/lib/env.ts';
import { DICTS } from '../src/i18n/dict.ts';

const altyn = { lat: 42.372, lon: 78.628 };

test('directions: Google, Yandex and 2GIS deep links carry the right coordinates and order', () => {
  assert.equal(directionsUrl('google', altyn), 'https://www.google.com/maps/dir/?api=1&destination=42.372,78.628');
  assert.equal(yandexDirectionsUrl(altyn), 'https://yandex.ru/maps/?rtext=~42.372%2C78.628&rtt=auto');
  assert.equal(twoGisDirectionsUrl(altyn), 'https://2gis.kg/directions/points/%7C78.628%2C42.372'); // lon,lat
  assert.throws(() => directionsUrl('yandex', { lat: NaN, lon: 1 }));
});

test('map: Mapbox dark style when a public token is set; free dark fallback otherwise; secret tokens rejected', () => {
  assert.equal(mapProvider({ NEXT_PUBLIC_MAPBOX_TOKEN: 'pk.abc' }), 'mapbox');
  const s = mapStyle({ NEXT_PUBLIC_MAPBOX_TOKEN: 'pk.abc' }) as { sources: { mapbox: { tiles: string[] } } };
  assert.match(s.sources.mapbox.tiles[0], /styles\/v1\/mapbox\/dark-v11\/tiles\/512.*access_token=pk\.abc/);
  assert.equal(mapStyle({}), 'https://tiles.openfreemap.org/styles/dark');
  assert.throws(() => mapboxDarkStyle('sk.secret'));
});

test('env: production refuses demo mode and missing Supabase config; anon key must differ from service key', () => {
  assert.throws(() => assertEnv({ NODE_ENV: 'production', DEMO_MODE: 'true' }), /DEMO_MODE/);
  assert.doesNotThrow(() => assertEnv({ NODE_ENV: 'development', DEMO_MODE: 'true' }));
  assert.throws(() => assertEnv({ DEMO_MODE: 'false' }), /NEXT_PUBLIC_SUPABASE_URL/);
  const ok = { DEMO_MODE: 'false', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 'b', NEXT_PUBLIC_SITE_URL: 'https://jolify.kg' };
  assert.doesNotThrow(() => assertEnv(ok));
  assert.throws(() => assertEnv({ ...ok, SUPABASE_SERVICE_ROLE_KEY: 'a' }), /service-role/);
  assert.throws(() => assertEnv({ ...ok, NEXT_PUBLIC_MAP_PROVIDER: 'mapbox' }), /MAPBOX_TOKEN/);
});

test('i18n: every UI string has a real RU and KY translation (no English leftovers in the dictionary)', () => {
  const flat = (o: object, p = ''): [string, string][] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, p + k + '.') : [[p + k, String(v)]]));
  const en = new Map(flat(DICTS.en));
  // Brand/product names and universal abbreviations that are correctly identical across languages.
  const allowSame = new Set(['assistant.ai', 'auth.email', 'partner.email', 'portal.profile.instagram', 'portal.profile.facebook', 'portal.profile.telegram', 'portal.profile.whatsapp', 'market.maxUsd', 'admin.table.email', 'bookingAction.pending', 'facts.durations.2 days', 'facts.durations.1 day']);
  for (const lang of ['ru', 'ky'] as const) {
    const left = flat(DICTS[lang]).filter(([k, v]) => en.get(k) === v && v !== '' && !allowSame.has(k)).map(([k]) => k);
    const missing = [...en.keys()].filter((k) => !flat(DICTS[lang]).some(([x]) => x === k));
    assert.deepEqual(missing, [], lang + ' missing keys: ' + missing.join(', '));
    assert.deepEqual(left, [], lang + ' untranslated: ' + left.join(', '));
  }
});

test('production seed contains curated destinations only: zero partners, listings, users, bookings, payments, reviews', () => {
  const sql = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
  assert.ok((sql.match(/insert into public\.destinations/g) ?? []).length >= 20);
  for (const t of ['partners', 'listings', 'profiles', 'bookings', 'payments', 'reviews', 'analytics_events', 'partner_members']) {
    assert.ok(!new RegExp('insert into public\\.' + t + '\\b').test(sql), 'seed.sql must not insert into ' + t);
  }
});

test('migration 0004: payments are service-role-only writes and test payments never count as revenue', () => {
  const sql = readFileSync(new URL('../supabase/migrations/0004_payments_and_clean_start.sql', import.meta.url), 'utf8');
  assert.match(sql, /enum \('pending', 'paid', 'failed', 'refunded', 'cancelled'\)/);
  assert.match(sql, /where status = 'paid' and not is_test/);
  assert.ok(!/create policy \w+ on public\.payments for (insert|update|all)/.test(sql));
  assert.match(sql, /delete from public\.partners\s+where is_demo/);
});
