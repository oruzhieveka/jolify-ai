/**
 * Framework-agnostic request handlers. Next.js route files are thin wrappers around these,
 * which lets the whole API be exercised by node:test with MemoryRepo and a mocked LLM.
 */
import { z } from 'zod';
import type { BookingRecord, Repo, SessionUser } from './repo.ts';
import { modifyWithAi, planWithAi, type AiDeps } from './ai/service.ts';
import { validateItinerary } from '../core/validate.ts';
import { canTransition } from '../core/bookings.ts';
import { costOf } from '../core/pricing.ts';
import { PartnerApplicationSchema, consentRecords } from '../core/consent.ts';
import { ListingInputSchema } from '../core/listing-schema.ts';
import { EVENT_TYPES, summarize } from '../core/analytics.ts';
import { BOOKING_STATUSES, LANGS, type Itinerary } from '../core/types.ts';

export interface Ctx { repo: Repo; user: SessionUser | null; sessionId: string | null; ai: AiDeps }
export interface Res { status: number; body: unknown }

export const ok = (body: unknown, status = 200): Res => ({ status, body });
/** Stable, translatable error codes. `error` stays English for logs; UIs show t.errors[code]. */
export const ERROR_CODES: Record<string, string> = {
  'Sign in required': 'sign_in_required', Forbidden: 'forbidden', 'Not found': 'not_found', 'Invalid request': 'invalid_request',
  'Describe your trip in a few words': 'describe_trip', 'Empty message': 'empty_message', 'End date is before start date': 'end_before_start',
  'Start date is in the past': 'start_in_past', 'This listing is not available': 'listing_unavailable', 'Trip not found': 'not_found',
  'Itinerary failed validation and was not saved': 'itinerary_invalid', 'Please check the form': 'check_form', 'Please check the listing': 'check_form',
  'Please complete the application': 'check_form', 'Unknown destination': 'unknown_destination', 'Unknown event': 'invalid_request',
  'You are not a member of this partner account': 'forbidden', 'Invalid status': 'invalid_status', 'Invalid decision': 'invalid_request',
};
const codeFor = (status: number, error: string) => ERROR_CODES[error] ?? (status === 401 ? 'sign_in_required' : status === 403 ? 'forbidden' : status === 404 ? 'not_found' : status === 409 ? 'invalid_status' : status === 429 ? 'rate_limited' : status === 503 ? 'unavailable' : status >= 500 ? 'server' : 'invalid_request');
export const err = (status: number, error: string, details?: unknown, code?: string): Res => ({ status, body: { error, code: code ?? codeFor(status, error), details } });
export const needUser = (c: Ctx) => (c.user ? null : err(401, 'Sign in required'));
export const needRole = (c: Ctx, r: 'partner' | 'admin') => needUser(c) ?? (c.user!.role === r || c.user!.role === 'admin' ? null : err(403, 'Forbidden'));

export function track(c: Ctx) {
  return (type: string, props: Record<string, unknown> = {}) =>
    c.repo.insertEvent({ type, props, user_id: c.user?.id ?? null, session_id: c.sessionId, created_at: new Date().toISOString() }).catch(() => {});
}

const Lang = z.enum(LANGS).default('en');

export async function aiPlan(c: Ctx, body: unknown): Promise<Res> {
  const p = z.object({ text: z.string().trim().min(3).max(2000), lang: Lang }).safeParse(body);
  if (!p.success) return err(400, 'Describe your trip in a few words', p.error.issues);
  const cat = await c.repo.catalog();
  const out = await planWithAi(cat, p.data.text, p.data.lang, { ...c.ai, track: track(c) });
  return out.ok ? ok(out) : err(422, out.reply, out.rejected, 'ai_failed');
}

export async function aiModify(c: Ctx, body: unknown): Promise<Res> {
  const p = z.object({ itinerary: z.unknown(), instruction: z.string().trim().min(2).max(500), lang: Lang, trip_id: z.string().optional() }).safeParse(body);
  if (!p.success) return err(400, 'Invalid request', p.error.issues);
  const cat = await c.repo.catalog();
  const out = await modifyWithAi(cat, p.data.itinerary as Itinerary, p.data.instruction, p.data.lang, { ...c.ai, track: track(c) });
  if (!out.ok) return err(422, out.reply, out.rejected, 'ai_failed');
  if (out.applied && p.data.trip_id && c.user && out.itinerary) await c.repo.updateTrip(c.user.id, p.data.trip_id, out.itinerary);
  return ok(out);
}

export async function saveTrip(c: Ctx, body: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const p = z.object({ itinerary: z.unknown(), trip_id: z.string().optional() }).safeParse(body);
  if (!p.success) return err(400, 'Invalid request');
  const cat = await c.repo.catalog();
  const v = validateItinerary(cat, p.data.itinerary);
  if (!v.valid) return err(422, 'Itinerary failed validation and was not saved', v.errors);
  const it = p.data.itinerary as Itinerary;
  const row = p.data.trip_id ? await c.repo.updateTrip(c.user!.id, p.data.trip_id, it) : await c.repo.saveTrip(c.user!.id, it);
  if (!row) return err(404, 'Trip not found');
  await track(c)('trip_saved', { trip_id: row.id, days: it.days.length });
  return ok({ trip: row }, p.data.trip_id ? 200 : 201);
}

export async function listTrips(c: Ctx): Promise<Res> {
  const u = needUser(c); if (u) return u;
  return ok({ trips: await c.repo.listTrips(c.user!.id) });
}

const InquirySchema = z.object({
  listing_id: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  guests: z.number().int().min(1).max(50),
  message: z.string().trim().min(5).max(2000),
  trip_id: z.string().nullable().optional(),
});

export async function createInquiry(c: Ctx, body: unknown, today = new Date().toISOString().slice(0, 10)): Promise<Res> {
  const u = needUser(c); if (u) return u;
  if (!(await c.repo.getSettings()).inquiries_enabled) return err(503, 'Inquiries are paused', undefined, 'unavailable');
  const p = InquirySchema.safeParse(body);
  if (!p.success) return err(400, 'Please check the form', p.error.issues);
  const d = p.data;
  if (d.start_date < today) return err(400, 'Start date is in the past');
  if (d.end_date && d.end_date < d.start_date) return err(400, 'End date is before start date');
  const l = await c.repo.listing(d.listing_id);
  if (!l || l.status !== 'approved') return err(404, 'This listing is not available');
  const owner = await c.repo.getPartner(l.partnerId);
  if (owner && owner.status !== 'active') return err(404, 'This listing is not available');
  const units = d.end_date && /night|day/.test(l.unit) ? Math.max(1, Math.round((Date.parse(d.end_date) - Date.parse(d.start_date)) / 86400000)) : 1;
  const b = await c.repo.createBooking({
    listing_id: l.id, partner_id: l.partnerId, traveler_id: c.user!.id, trip_id: d.trip_id ?? null, status: 'pending',
    start_date: d.start_date, end_date: d.end_date ?? null, guests: d.guests, message: d.message, total_usd: costOf(l, d.guests) * units,
  });
  await track(c)('inquiry_created', { listing_id: l.id, partner_id: l.partnerId });
  return ok({ booking: b, note: 'Request sent. It is pending until the partner confirms it.' }, 201);
}

export async function changeBookingStatus(c: Ctx, id: string, body: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const p = z.object({ status: z.enum(BOOKING_STATUSES), note: z.string().max(500).optional() }).safeParse(body);
  if (!p.success) return err(400, 'Invalid status');
  const b = await c.repo.getBooking(id);
  if (!b) return err(404, 'Not found');
  const user = c.user!;
  const isOwnerPartner = (await c.repo.partnerIdsForUser(user.id)).includes(b.partner_id);
  const actingRole = user.role === 'admin' ? 'admin' : isOwnerPartner ? 'partner' : b.traveler_id === user.id ? 'traveler' : null;
  if (!actingRole) return err(403, 'Forbidden');
  if (!canTransition(b.status, p.data.status, actingRole)) return err(409, `Cannot change ${b.status} to ${p.data.status} as ${actingRole}`, undefined, 'invalid_transition');
  const nb = await c.repo.setBookingStatus(id, p.data.status, user.id, p.data.note ?? null);
  await track(c)('booking_status_changed', { from: b.status, to: p.data.status, by: actingRole });
  return ok({ booking: nb });
}

export async function postBookingMessage(c: Ctx, id: string, body: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const p = z.object({ body: z.string().trim().min(1).max(2000) }).safeParse(body);
  if (!p.success) return err(400, 'Empty message');
  const b = await c.repo.getBooking(id);
  if (!b) return err(404, 'Not found');
  const partnerIds = await c.repo.partnerIdsForUser(c.user!.id);
  if (b.traveler_id !== c.user!.id && !partnerIds.includes(b.partner_id) && c.user!.role !== 'admin') return err(403, 'Forbidden');
  return ok({ message: await c.repo.addBookingMessage(id, c.user!.id, p.data.body) }, 201);
}

export async function partnerApply(c: Ctx, body: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  if (!(await c.repo.getSettings()).partner_applications_open) return err(503, 'Applications are closed', undefined, 'unavailable');
  const p = PartnerApplicationSchema.safeParse(body);
  if (!p.success) return err(400, 'Please complete the application', p.error.issues);
  const consents = consentRecords(c.user!.id, p.data);
  const app = await c.repo.createApplication(c.user!.id, p.data, consents);
  await track(c)('partner_application_submitted', { category: p.data.category });
  return ok({ application: app, consents }, 201);
}

export async function decideApplication(c: Ctx, id: string, body: unknown): Promise<Res> {
  const r = needRole(c, 'admin'); if (r) return r;
  if (c.user!.role !== 'admin') return err(403, 'Forbidden');
  const p = z.object({ decision: z.enum(['approved', 'rejected']) }).safeParse(body);
  if (!p.success) return err(400, 'Invalid decision');
  return ok(await c.repo.decideApplication(id, p.data.decision, c.user!.id));
}

export async function createListing(c: Ctx, body: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const p = ListingInputSchema.extend({ partner_id: z.string(), save_as_draft: z.boolean().optional() }).safeParse(body);
  if (!p.success) return err(400, 'Please check the listing', p.error.issues);
  const mine = await c.repo.partnerIdsForUser(c.user!.id);
  if (!mine.includes(p.data.partner_id)) return err(403, 'You are not a member of this partner account');
  const cat = await c.repo.catalog();
  if (!cat.dest(p.data.destination_id)) return err(400, 'Unknown destination');
  const { partner_id, save_as_draft, ...input } = p.data;
  const l = await c.repo.createListing(partner_id, input, save_as_draft ? 'draft' : 'pending_review');
  await track(c)('partner_listing_created', { category: l.category });
  return ok({ listing: l }, 201);
}

export async function reviewListing(c: Ctx, id: string, body: unknown): Promise<Res> {
  const r = needRole(c, 'admin'); if (r) return r;
  if (c.user!.role !== 'admin') return err(403, 'Forbidden');
  const p = z.object({ status: z.enum(['approved', 'rejected', 'suspended']) }).safeParse(body);
  if (!p.success) return err(400, 'Invalid status');
  const l = await c.repo.setListingStatus(id, p.data.status, c.user!.id);
  return l ? ok({ listing: l }) : err(404, 'Not found');
}

export async function recordEvent(c: Ctx, body: unknown): Promise<Res> {
  const p = z.object({ type: z.enum(EVENT_TYPES), props: z.record(z.string(), z.unknown()).optional() }).safeParse(body);
  if (!p.success) return err(400, 'Unknown event');
  const props = JSON.stringify(p.data.props ?? {}).length > 2000 ? {} : p.data.props;
  await track(c)(p.data.type, props);
  return ok({ ok: true }, 202);
}

export async function adminSummary(c: Ctx, days = 30): Promise<Res> {
  const r = needRole(c, 'admin'); if (r) return r;
  if (c.user!.role !== 'admin') return err(403, 'Forbidden');
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [ev, bk] = await Promise.all([c.repo.events(since), c.repo.bookings(since)]);
  return ok({ summary: summarize(ev, bk, days), dataSource: c.repo.kind });
}

// ---------- dashboard read models (used by server components; also unit-tested) ----------

export async function withThreads(c: Ctx, rows: BookingRecord[]) {
  const cat = await c.repo.catalog();
  return Promise.all(rows.map(async (b) => {
    const l = cat.listing(b.listing_id) ?? (await c.repo.listing(b.listing_id));
    const [messages, events] = await Promise.all([c.repo.bookingMessages(b.id), c.repo.bookingEvents(b.id)]);
    return { ...b, listing_title: l?.title ?? b.listing_id, messages, events };
  }));
}

export async function travelerOverview(c: Ctx): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const [trips, bookings] = await Promise.all([c.repo.listTrips(c.user!.id), c.repo.bookingsForTraveler(c.user!.id)]);
  return ok({ trips, bookings: await withThreads(c, bookings.sort((a, b) => b.created_at.localeCompare(a.created_at))) });
}

export async function partnerOverview(c: Ctx, days = 30): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const ids = await c.repo.partnerIdsForUser(c.user!.id);
  if (!ids.length) return ok({ partnerIds: [], partners: [], listings: [], bookings: [], stats: null });
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [all, listings, bookings, events] = await Promise.all([
    c.repo.partners(), c.repo.listingsForPartners(ids), c.repo.bookingsForPartners(ids), c.repo.events(since),
  ]);
  const mine = new Set(listings.map((l) => l.id));
  const views = events.filter((e) => e.type === 'listing_viewed' && mine.has(String(e.props?.listing_id ?? '')));
  const recent = bookings.filter((b) => b.created_at >= since);
  const stats = {
    days,
    listingViews: views.length,
    inquiries: recent.length,
    confirmed: recent.filter((b) => b.status === 'confirmed' || b.status === 'completed').length,
    viewsByListing: Object.fromEntries(listings.map((l) => [l.id, views.filter((v) => v.props?.listing_id === l.id).length])),
  };
  return ok({
    partnerIds: ids, partners: all.filter((p) => ids.includes(p.id)), listings,
    bookings: await withThreads(c, bookings.sort((a, b) => b.created_at.localeCompare(a.created_at))), stats,
  });
}

export async function adminQueues(c: Ctx): Promise<Res> {
  const r = needRole(c, 'admin'); if (r) return r;
  if (c.user!.role !== 'admin') return err(403, 'Forbidden');
  const [applications, pendingListings] = await Promise.all([c.repo.listApplications('submitted'), c.repo.listingsByStatus('pending_review')]);
  return ok({ applications, pendingListings });
}
