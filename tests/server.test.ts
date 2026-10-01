import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepo } from '../src/server/repo-memory.ts';
import * as H from '../src/server/handlers.ts';
import type { Ctx } from '../src/server/handlers.ts';
import { PARTNER_POLICY_VERSION } from '../src/core/consent.ts';
import { costOf } from '../src/core/pricing.ts';

const traveler = { id: 'u-trav', role: 'traveler' as const };
const partnerUser = { id: 'u-partner', role: 'partner' as const };
const admin = { id: 'u-admin', role: 'admin' as const };

function ctx(repo: MemoryRepo, user: Ctx['user'], fetchImpl?: typeof fetch): Ctx {
  return { repo, user, sessionId: 's1', ai: { anthropic: fetchImpl ? { apiKey: 'test', model: 'claude-test', fetchImpl } : null } };
}
function mockAnthropic(inputs: unknown[]) {
  const calls: any[] = [];
  const f = (async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    const input = inputs[Math.min(calls.length - 1, inputs.length - 1)];
    if (input === 'HTTP500') return new Response('overloaded', { status: 529 });
    return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'create_itinerary', input }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}
const goodSkeleton = {
  trip_title: 'Ala Archa and Issyk-Kul', summary: 'Mountains then lake.',
  days: [
    { location: 'bishkek', title: 'Arrive', free_activities: ['Walk Ala-Too Square'], restaurant_ids: ['l-kok'], accommodation_id: 'l-chui', transport_ids: ['l-airport'] },
    { location: 'ala-archa', title: 'Gorge hike', free_activities: ['Ak-Sai trail'], accommodation_id: 'l-chui', transport_ids: ['l-driver'], cost: 1 },
  ],
};

test('LLM path: valid tool output is hydrated with DATABASE prices and names', async () => {
  const repo = new MemoryRepo();
  const { f, calls } = mockAnthropic([goodSkeleton]);
  const r = await H.aiPlan(ctx(repo, null, f), { text: '2 days, 2 people, mountains', lang: 'en' });
  assert.equal(r.status, 200);
  const out = r.body as any;
  assert.equal(out.provider, 'anthropic');
  const chui = repo.listings.find((l) => l.id === 'l-chui')!;
  assert.equal(out.itinerary.days[0].accommodation.cost, costOf(chui, 2));
  assert.equal(out.itinerary.days[0].accommodation.name, chui.title);
  assert.equal(calls[0].tool_choice.name, 'create_itinerary');
  assert.ok(calls[0].system[1].text.includes('l-chui'), 'catalogue context sent');
  assert.ok(repo.eventRows.some((e) => e.type === 'ai_plan_succeeded'));
});

test('LLM path: hallucinated listing is rejected, retried, then falls back to rules engine', async () => {
  const repo = new MemoryRepo();
  const bad = { ...goodSkeleton, days: [{ location: 'bishkek', title: 'x', restaurant_ids: ['l-invented-cafe'] }] };
  const { f, calls } = mockAnthropic([bad, bad]);
  const r = await H.aiPlan(ctx(repo, null, f), { text: '4 days, lakes', lang: 'en' });
  const out = r.body as any;
  assert.equal(r.status, 200);
  assert.equal(calls.length, 2, 'one retry with validator feedback');
  assert.match(calls[1].messages.at(-1).content, /rejected by the validator/);
  assert.equal(out.provider, 'rules');
  assert.ok(out.rejected.some((e: string) => e.includes('l-invented-cafe')));
  assert.ok(!JSON.stringify(out.itinerary).includes('l-invented-cafe'));
  assert.ok(repo.eventRows.some((e) => e.type === 'ai_plan_fallback'));
});

test('LLM path: provider error falls back gracefully', async () => {
  const { f } = mockAnthropic(['HTTP500']);
  const r = await H.aiPlan(ctx(new MemoryRepo(), null, f), { text: '3 days culture', lang: 'ru' });
  assert.equal((r.body as any).provider, 'rules');
  assert.equal((r.body as any).itinerary.language, 'ru');
});

test('modify: tampered itinerary from client is refused', async () => {
  const repo = new MemoryRepo();
  const plan = (await H.aiPlan(ctx(repo, null), { text: '5 days mountains', lang: 'en' })).body as any;
  const it = plan.itinerary;
  it.days[1].accommodation.cost = 0;
  const r = await H.aiModify(ctx(repo, null), { itinerary: it, instruction: 'make day 2 cheaper', lang: 'en' });
  assert.equal(r.status, 422);
});

test('trips: auth required, validated before save, owner-scoped', async () => {
  const repo = new MemoryRepo();
  const it = ((await H.aiPlan(ctx(repo, null), { text: '5 days', lang: 'en' })).body as any).itinerary;
  assert.equal((await H.saveTrip(ctx(repo, null), { itinerary: it })).status, 401);
  const bad = structuredClone(it); bad.estimated_budget.amount = 1;
  assert.equal((await H.saveTrip(ctx(repo, traveler), { itinerary: bad })).status, 422);
  assert.equal((await H.saveTrip(ctx(repo, traveler), { itinerary: it })).status, 201);
  assert.equal(((await H.listTrips(ctx(repo, traveler))).body as any).trips.length, 1);
  assert.equal(((await H.listTrips(ctx(repo, admin))).body as any).trips.length, 0);
});

test('partner onboarding: consent required and stored with version + timestamp; listing needs approval', async () => {
  const repo = new MemoryRepo();
  const base = { business_name: 'Kochkor Felt Yurts', category: 'accommodation', city: 'Kochkor', contact_name: 'Asel', phone: '+996 555 123 456', email: 'asel@example.com', description: 'Family yurt camp near Song-Kul with home cooking.', policy_version: PARTNER_POLICY_VERSION };
  const r1 = await H.partnerApply(ctx(repo, partnerUser), { ...base, consents: { partner_terms: true, data_processing: false, listing_accuracy: true } });
  assert.equal(r1.status, 400);
  const r2 = await H.partnerApply(ctx(repo, partnerUser), { ...base, consents: { partner_terms: true, data_processing: true, listing_accuracy: true } });
  assert.equal(r2.status, 201);
  assert.equal(repo.consents.length, 4);
  assert.ok(repo.consents.every((c) => c.policy_version === PARTNER_POLICY_VERSION && c.user_id === 'u-partner' && !!Date.parse(c.granted_at)));
  assert.equal(repo.consents.find((c) => c.consent_type === 'marketing')!.status, 'declined');

  const appId = (r2.body as any).application.id;
  assert.equal((await H.decideApplication(ctx(repo, partnerUser), appId, { decision: 'approved' })).status, 403);
  const d = await H.decideApplication(ctx(repo, admin), appId, { decision: 'approved' });
  const partnerId = (d.body as any).partnerId;
  assert.ok(partnerId);

  const listing = { partner_id: partnerId, title: 'Song-Kul yurt stay', category: 'yurt', destination_id: 'song-kul', price_usd: 30, price_unit: 'person-night', description: 'Yurt with dinner and breakfast by the lake shore.' };
  assert.equal((await H.createListing(ctx(repo, traveler), listing)).status, 403);
  const lr = await H.createListing(ctx(repo, partnerUser), listing);
  assert.equal(lr.status, 201);
  const l = (lr.body as any).listing;
  assert.equal(l.status, 'pending_review');
  assert.equal((await repo.catalog()).approvedListing(l.id), undefined, 'not visible to AI before approval');
  await H.reviewListing(ctx(repo, admin), l.id, { status: 'approved' });
  assert.ok((await repo.catalog()).approvedListing(l.id));
});

test('bookings: pending until partner confirms; role-checked transitions', async () => {
  const repo = new MemoryRepo();
  repo.partnerMembers.push({ user_id: 'u-partner', partner_id: 'p-nomad' });
  const today = '2026-10-01';
  assert.equal((await H.createInquiry(ctx(repo, traveler), { listing_id: 'l-chui', start_date: '2026-09-01', guests: 2, message: 'Hello there' }, today)).status, 400);
  const r = await H.createInquiry(ctx(repo, traveler), { listing_id: 'l-chui', start_date: '2026-10-10', end_date: '2026-10-13', guests: 2, message: 'Two nights please' }, today);
  assert.equal(r.status, 201);
  const b = (r.body as any).booking;
  assert.equal(b.status, 'pending');
  assert.equal(b.total_usd, 32 * 3);
  assert.equal((await H.changeBookingStatus(ctx(repo, traveler), b.id, { status: 'confirmed' })).status, 409, 'traveler cannot confirm');
  assert.equal((await H.changeBookingStatus(ctx(repo, { id: 'stranger', role: 'partner' }), b.id, { status: 'confirmed' })).status, 403);
  assert.equal((await H.changeBookingStatus(ctx(repo, partnerUser), b.id, { status: 'confirmed' })).status, 200);
  assert.equal((await H.changeBookingStatus(ctx(repo, partnerUser), b.id, { status: 'completed' })).status, 200);
  assert.equal((await H.changeBookingStatus(ctx(repo, traveler), b.id, { status: 'cancelled' })).status, 409, 'completed is terminal');
  assert.equal((await repo.bookingEvents(b.id)).length, 3);
  assert.equal((await H.postBookingMessage(ctx(repo, { id: 'x', role: 'traveler' }), b.id, { body: 'hi' })).status, 403);
  assert.equal((await H.createInquiry(ctx(repo, traveler), { listing_id: 'nope', start_date: '2026-10-10', guests: 1, message: 'Hello there' }, today)).status, 404);
});

test('admin analytics: empty platform reports no data (no fabricated numbers); real events counted', async () => {
  const repo = new MemoryRepo();
  assert.equal((await H.adminSummary(ctx(repo, traveler))).status, 403);
  const empty = ((await H.adminSummary(ctx(repo, admin))).body as any).summary;
  assert.equal(empty.hasData, false);
  assert.ok(empty.traffic.every((m: any) => m.value === null));
  await H.recordEvent(ctx(repo, null), { type: 'page_view', props: { path: '/' } });
  assert.equal((await H.recordEvent(ctx(repo, null), { type: 'made_up_event' })).status, 400);
  await H.aiPlan(ctx(repo, null), { text: '3 days', lang: 'en' });
  const s = ((await H.adminSummary(ctx(repo, admin))).body as any).summary;
  assert.equal(s.traffic[0].value, 1);
  assert.equal(s.ai[0].value, 1);
  assert.equal(s.ai[1].value, 100);
});
