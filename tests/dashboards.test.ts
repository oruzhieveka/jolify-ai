import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepo } from '../src/server/repo-memory.ts';
import * as h from '../src/server/handlers.ts';
import type { Ctx } from '../src/server/handlers.ts';

const mk = (repo: MemoryRepo, user: Ctx['user']): Ctx => ({ repo, user, sessionId: 's1', ai: { anthropic: null } });
const future = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);

test('dashboards: traveler, partner and admin read models', async () => {
  const repo = new MemoryRepo();
  repo.partnerMembers.push({ user_id: 'u-p', partner_id: 'p-nomad' });
  const trav = mk(repo, { id: 'u-t', role: 'traveler' });
  const part = mk(repo, { id: 'u-p', role: 'partner' });
  const admin = mk(repo, { id: 'u-a', role: 'admin' });
  const nomadListing = repo.listings.find((l) => l.partnerId === 'p-nomad' && l.status === 'approved')!;

  assert.equal((await h.travelerOverview(mk(repo, null))).status, 401);
  await h.recordEvent(trav, { type: 'listing_viewed', props: { listing_id: nomadListing.id } });
  const inq = await h.createInquiry(trav, { listing_id: nomadListing.id, start_date: future, guests: 2, message: 'Hello, is this free?' });
  assert.equal(inq.status, 201);
  const bid = (inq.body as any).booking.id;
  await h.postBookingMessage(part, bid, { body: 'Yes, we have space.' });

  const t = (await h.travelerOverview(trav)).body as any;
  assert.equal(t.bookings.length, 1);
  assert.equal(t.bookings[0].listing_title, nomadListing.title);
  assert.equal(t.bookings[0].messages.length, 1);
  assert.equal(t.bookings[0].status, 'pending');

  const p = (await h.partnerOverview(part)).body as any;
  assert.deepEqual(p.partnerIds, ['p-nomad']);
  assert.equal(p.partners[0].name, 'Nomad Hospitality Group');
  assert.equal(p.stats.listingViews, 1);
  assert.equal(p.stats.inquiries, 1);
  assert.equal(p.stats.confirmed, 0);
  assert.ok(p.listings.every((l: any) => l.partnerId === 'p-nomad'));

  // a partner with no memberships gets an empty, honest dashboard
  const lone = (await h.partnerOverview(mk(repo, { id: 'u-x', role: 'partner' }))).body as any;
  assert.equal(lone.stats, null);

  assert.equal((await h.adminQueues(trav)).status, 403);
  await h.createListing(part, { partner_id: 'p-nomad', title: 'New yurt camp', category: 'yurt', destination_id: 'song-kul', price_usd: 40, price_unit: 'person-night', description: 'Six yurts on the north shore with home cooking.' });
  const q = (await h.adminQueues(admin)).body as any;
  assert.equal(q.pendingListings.length, 1);
  assert.equal(q.pendingListings[0].status, 'pending_review');
});

test('approved application creates a verified partner the applicant can manage', async () => {
  const repo = new MemoryRepo();
  const user = mk(repo, { id: 'u-new', role: 'traveler' });
  const admin = mk(repo, { id: 'u-a', role: 'admin' });
  const app = await h.partnerApply(user, {
    business_name: 'Kel-Suu Riders', category: 'tour_operator', city: 'Naryn', contact_name: 'Aibek', phone: '+996 555 123 456',
    email: 'aibek@example.com', website: '', description: 'Horse treks to Kel-Suu lake with local herders.',
    consents: { partner_terms: true, data_processing: true, listing_accuracy: true, marketing: false }, policy_version: '2026-10-01',
  });
  assert.equal(app.status, 201);
  const d = await h.decideApplication(admin, (app.body as any).application.id, { decision: 'approved' });
  const pid = (d.body as any).partnerId;
  const ov = (await h.partnerOverview(user)).body as any;
  assert.deepEqual(ov.partnerIds, [pid]);
  assert.equal(ov.partners[0].name, 'Kel-Suu Riders');
});
