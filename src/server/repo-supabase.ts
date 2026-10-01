/**
 * Production repository on Supabase. Uses the USER-scoped client so RLS applies to every
 * read/write; the service client is used only for analytics inserts/reads by admins.
 * NOTE: not exercised by the automated tests in this repo (no Postgres in CI yet); see docs/BACKLOG.md.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { Catalog } from '../core/catalog.ts';
import type { BookingStatus, Destination, Itinerary, Listing, ListingStatus, Partner, PartnerProfile, Role } from '../core/types.ts';
import type { MediaOwnerType, MediaRow } from '../core/media.ts';
import type { PartnerProfileInput } from '../core/partner-profile.ts';
import type { ConsentRecord, PartnerApplicationInput } from '../core/consent.ts';
import type { ListingInput } from '../core/listing-schema.ts';
import type { EventRow } from '../core/analytics.ts';
import { DEFAULT_SETTINGS } from './repo.ts';
import type { ApplicationRow, BookingEvent, BookingMessage, BookingRecord, ConversationRow, DestinationPatch, ListingQuery, PaymentRow, PlatformSettings, ProfileRow, Repo, TripRow } from './repo.ts';

type Row = Record<string, any>;
const toListing = (r: Row): Listing => ({
  id: r.id, partnerId: r.partner_id, category: r.category, title: r.title, destinationId: r.destination_id,
  priceUsd: Number(r.price_usd), unit: r.price_unit, tags: r.tags ?? [], description: r.description,
  status: r.status, isDemo: r.is_demo, lat: r.lat, lon: r.lon,
});
const toDest = (r: Row): Destination => ({
  id: r.id, name: r.name, region: r.region, lat: r.lat, lon: r.lon, season: r.season, duration: r.duration,
  difficulty: r.difficulty, budgetPerDayUsd: Number(r.budget_per_day_usd ?? 0), tags: r.tags ?? [], activities: r.activities ?? [],
  description: r.description, tips: r.tips ?? [], order: r.sort_order, popularity: r.popularity, zone: r.zone, dayTitle: r.day_title, details: r.details ?? {},
  i18n: r.i18n ?? {}, published: r.published,
});
const PARTNER_COLS = 'id, name, category, city, verified, is_demo, description, destination_id, address, phone, email, website, social, opening_hours, services, amenities, price_note, status, created_at';
const toPartner = (r: Row): PartnerProfile => ({
  id: r.id, name: r.name, category: r.category, city: r.city, verified: r.verified, isDemo: r.is_demo, description: r.description ?? '', destinationId: r.destination_id ?? null,
  address: r.address ?? '', phone: r.phone ?? '', email: r.email ?? '', website: r.website ?? '', social: { instagram: '', facebook: '', telegram: '', whatsapp: '', ...(r.social ?? {}) },
  openingHours: r.opening_hours ?? null, services: r.services ?? [], amenities: r.amenities ?? [], priceNote: r.price_note ?? '', status: r.status ?? 'active', createdAt: r.created_at,
});
const MEDIA_COLS = 'id, owner_type, owner_id, storage_path, position, is_cover, alt, caption, width, height, bytes, content_type, author, license, source_url, created_by, created_at';
const toBooking = (r: Row): BookingRecord => ({ ...(r as BookingRecord), total_usd: Number(r.total_usd) });
function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const LISTING_COLS = 'id, partner_id, category, title, destination_id, price_usd, price_unit, tags, description, status, is_demo, lat, lon';

export class SupabaseRepo implements Repo {
  readonly kind = 'supabase' as const;
  private db: SupabaseClient;
  private svc: SupabaseClient | null;
  constructor(db: SupabaseClient, svc: SupabaseClient | null) { this.db = db; this.svc = svc; }

  async catalog() {
    const [d, l] = await Promise.all([
      this.db.from('destinations').select('*').eq('published', true),
      // Only approved listings are ever handed to the planner/validator.
      this.db.from('listings').select(LISTING_COLS).eq('status', 'approved'),
    ]);
    return new Catalog((must(d) as Row[]).map(toDest), (must(l) as Row[]).map(toListing));
  }
  async listing(id: string) {
    const r = await this.db.from('listings').select(LISTING_COLS).eq('id', id).maybeSingle();
    return r.data ? toListing(r.data) : null;
  }

  async partners() {
    const rows = must(await this.db.from('partners').select('id, name, category, city, verified, is_demo').eq('status', 'active')) as Row[];
    return rows.map((r): Partner => ({ id: r.id, name: r.name, category: r.category, city: r.city, verified: r.verified, isDemo: r.is_demo }));
  }
  async searchListings(f: ListingQuery) {
    let q = this.db.from('listings').select(LISTING_COLS).eq('status', 'approved').in('category', f.categories).limit(Math.min(f.limit ?? 60, 100));
    if (f.destinationId) q = q.eq('destination_id', f.destinationId);
    if (f.maxPrice) q = q.lte('price_usd', f.maxPrice);
    // Escape PostgREST filter syntax characters before building the ilike pattern.
    const term = f.q?.trim().replace(/[%_,()\\*]/g, ' ').slice(0, 60);
    if (term) q = q.or('title.ilike.%' + term + '%,description.ilike.%' + term + '%');
    q = f.sort === 'price' ? q.order('price_usd', { ascending: true }) : f.sort === 'price-desc' ? q.order('price_usd', { ascending: false }) : q.order('created_at', { ascending: false });
    return (must(await q) as Row[]).map(toListing);
  }
  async listingsByStatus(status: ListingStatus) {
    return (must(await this.db.from('listings').select(LISTING_COLS).eq('status', status)) as Row[]).map(toListing);
  }

  async saveTrip(userId: string, it: Itinerary) {
    return must(await this.db.from('trips').insert({ user_id: userId, title: it.trip_title, itinerary: it }).select().single()) as TripRow;
  }
  async updateTrip(userId: string, id: string, it: Itinerary) {
    const r = await this.db.from('trips').update({ itinerary: it, title: it.trip_title }).eq('id', id).eq('user_id', userId).select().maybeSingle();
    return (r.data as TripRow) ?? null;
  }
  async listTrips(userId: string) {
    return must(await this.db.from('trips').select('*').eq('user_id', userId).order('updated_at', { ascending: false })) as TripRow[];
  }
  async getTrip(userId: string, id: string) {
    return ((await this.db.from('trips').select('*').eq('id', id).eq('user_id', userId).maybeSingle()).data as TripRow) ?? null;
  }
  async deleteTrip(userId: string, id: string) {
    const r = await this.db.from('trips').delete().eq('id', id).eq('user_id', userId).select('id');
    return (r.data?.length ?? 0) > 0;
  }

  async createBooking(b: Omit<BookingRecord, 'id' | 'created_at' | 'updated_at'>) {
    return toBooking(must(await this.db.from('bookings').insert(b).select().single()));
  }
  async getBooking(id: string) {
    const r = await this.db.from('bookings').select('*').eq('id', id).maybeSingle();
    return r.data ? toBooking(r.data) : null;
  }
  async setBookingStatus(id: string, to: BookingStatus, _actorId: string, note: string | null) {
    // Transition rules are enforced again inside Postgres (change_booking_status).
    return toBooking(must(await this.db.rpc('change_booking_status', { p_booking: id, p_to: to, p_note: note })));
  }
  async bookingEvents(id: string) {
    return must(await this.db.from('booking_events').select('*').eq('booking_id', id).order('created_at')) as BookingEvent[];
  }
  async addBookingMessage(bookingId: string, senderId: string, body: string) {
    return must(await this.db.from('booking_messages').insert({ booking_id: bookingId, sender_id: senderId, body }).select().single()) as BookingMessage;
  }
  async bookingMessages(bookingId: string) {
    return must(await this.db.from('booking_messages').select('*').eq('booking_id', bookingId).order('created_at')) as BookingMessage[];
  }
  async bookingsForTraveler(userId: string) {
    return (must(await this.db.from('bookings').select('*').eq('traveler_id', userId).order('created_at', { ascending: false })) as Row[]).map(toBooking);
  }
  async bookingsForPartners(ids: string[]) {
    if (!ids.length) return [];
    return (must(await this.db.from('bookings').select('*').in('partner_id', ids).order('created_at', { ascending: false })) as Row[]).map(toBooking);
  }

  async partnerIdsForUser(userId: string) {
    return (must(await this.db.from('partner_members').select('partner_id').eq('user_id', userId)) as Row[]).map((r) => r.partner_id as string);
  }
  async createApplication(userId: string, data: PartnerApplicationInput, consents: ConsentRecord[]) {
    const app = must(await this.db.from('partner_applications').insert({ user_id: userId, data, policy_version: data.policy_version }).select().single()) as ApplicationRow;
    must(await this.db.from('consents').insert(consents.map((c) => ({ ...c, application_id: app.id }))));
    return app;
  }
  async listApplications(status?: ApplicationRow['status']) {
    let q = this.db.from('partner_applications').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    return must(await q) as ApplicationRow[];
  }
  async decideApplication(id: string, decision: 'approved' | 'rejected') {
    const partnerId = must(await this.db.rpc('approve_partner_application', { p_app: id, p_decision: decision })) as string | null;
    const application = must(await this.db.from('partner_applications').select('*').eq('id', id).single()) as ApplicationRow;
    return { application, partnerId };
  }
  async createListing(partnerId: string, i: ListingInput, status: 'draft' | 'pending_review' = 'pending_review') {
    return toListing(must(await this.db.from('listings').insert({
      partner_id: partnerId, category: i.category, title: i.title, destination_id: i.destination_id, price_usd: i.price_usd,
      price_unit: i.price_unit, tags: i.tags ?? [], description: i.description, address: i.address, lat: i.lat, lon: i.lon,
      availability_note: i.availability_note, status,
    }).select(LISTING_COLS).single()));
  }
  async updateListing(partnerId: string, id: string, i: Partial<ListingInput>) {
    const patch: Row = {};
    for (const [k, v] of Object.entries(i)) if (v !== undefined) patch[k === 'destination_id' ? 'destination_id' : k] = v;
    const r = await this.db.from('listings').update(patch).eq('id', id).eq('partner_id', partnerId).select(LISTING_COLS).maybeSingle();
    return r.data ? toListing(r.data) : null;
  }
  async listingsForPartners(ids: string[]) {
    if (!ids.length) return [];
    return (must(await this.db.from('listings').select(LISTING_COLS).in('partner_id', ids)) as Row[]).map(toListing);
  }
  async setListingStatus(id: string, status: ListingStatus) {
    const r = await this.db.from('listings').update({ status }).eq('id', id).select(LISTING_COLS).maybeSingle();
    return r.data ? toListing(r.data) : null;
  }

  // ----- partner profile -----
  async getPartner(id: string) {
    const r = await this.db.from('partners').select(PARTNER_COLS).eq('id', id).maybeSingle();
    return r.data ? toPartner(r.data) : null;
  }
  async updatePartnerProfile(id: string, i: PartnerProfileInput) {
    const r = await this.db.from('partners').update({
      name: i.name, category: i.category, description: i.description, destination_id: i.destination_id, city: i.city, address: i.address, phone: i.phone,
      email: i.email, website: i.website, social: i.social, opening_hours: i.opening_hours, services: i.services, amenities: i.amenities, price_note: i.price_note,
    }).eq('id', id).select(PARTNER_COLS).maybeSingle();
    return r.data ? toPartner(r.data) : null;
  }
  async deleteListing(partnerId: string, id: string) {
    // RLS: listings_delete_member only allows non-approved listings of the user's own partner.
    const r = await this.db.from('listings').delete().eq('id', id).eq('partner_id', partnerId).neq('status', 'approved').select('id');
    if ((r.data?.length ?? 0) === 0) return false;
    await this.db.from('media').delete().eq('owner_type', 'listing').eq('owner_id', id);
    return true;
  }
  async submitListing(partnerId: string, id: string) {
    const r = await this.db.from('listings').update({ status: 'pending_review' }).eq('id', id).eq('partner_id', partnerId).in('status', ['draft', 'rejected']).select(LISTING_COLS).maybeSingle();
    return r.data ? toListing(r.data) : null;
  }

  // ----- media -----
  async listMedia(t: MediaOwnerType, id: string) {
    return must(await this.db.from('media').select(MEDIA_COLS).eq('owner_type', t).eq('owner_id', id).order('position')) as MediaRow[];
  }
  async getMedia(id: string) { return ((await this.db.from('media').select(MEDIA_COLS).eq('id', id).maybeSingle()).data as MediaRow) ?? null; }
  async addMedia(row: Omit<MediaRow, 'created_at'>) { return must(await this.db.from('media').insert(row).select(MEDIA_COLS).single()) as MediaRow; }
  async updateMedia(id: string, patch: { alt?: string | null; caption?: string | null }) {
    return ((await this.db.from('media').update(patch).eq('id', id).select(MEDIA_COLS).maybeSingle()).data as MediaRow) ?? null;
  }
  async deleteMedia(id: string) { return ((await this.db.from('media').delete().eq('id', id).select('id')).data?.length ?? 0) > 0; }
  async saveMediaOrder(rows: MediaRow[]) {
    if (!rows.length) return [];
    const cover = rows.find((r) => r.is_cover)?.id ?? null;
    return must(await this.db.rpc('save_media_order', { p_owner_type: rows[0].owner_type, p_owner_id: rows[0].owner_id, p_ids: rows.map((r) => r.id), p_cover: cover })) as MediaRow[];
  }
  async coverPhotos(t: MediaOwnerType, ids: string[]) {
    if (!ids.length) return [];
    return must(await this.db.from('media').select(MEDIA_COLS).eq('owner_type', t).in('owner_id', ids).eq('is_cover', true)) as MediaRow[];
  }

  // ----- admin (RLS: admin-only reads/writes; role change goes through an audited RPC) -----
  async listProfiles() { return must(await this.db.from('profiles').select('id, email, full_name, role, created_at').order('created_at', { ascending: false }).limit(1000)) as ProfileRow[]; }
  async setUserRole(userId: string, role: Role) { return (must(await this.db.rpc('admin_set_role', { p_user: userId, p_role: role })) as ProfileRow) ?? null; }
  async listPartnerProfiles() { return (must(await this.db.from('partners').select(PARTNER_COLS).order('created_at', { ascending: false })) as Row[]).map(toPartner); }
  async setPartnerFlags(id: string, f: { verified?: boolean; status?: 'active' | 'suspended' }) {
    const r = await this.db.from('partners').update(f).eq('id', id).select(PARTNER_COLS).maybeSingle();
    return r.data ? toPartner(r.data) : null;
  }
  async allListings() { return (must(await this.db.from('listings').select(LISTING_COLS).order('created_at', { ascending: false }).limit(2000)) as Row[]).map(toListing); }
  async allBookings() { return (must(await this.db.from('bookings').select('*').order('created_at', { ascending: false }).limit(2000)) as Row[]).map(toBooking); }
  async payments() {
    return (must(await this.db.from('payments').select('id, booking_id, provider, provider_ref, is_test, status, amount_usd, currency, created_at').order('created_at', { ascending: false }).limit(2000)) as Row[])
      .map((r) => ({ ...(r as PaymentRow), amount_usd: Number(r.amount_usd) }));
  }
  async allDestinations() { return (must(await this.db.from('destinations').select('*').order('sort_order')) as Row[]).map(toDest); }
  async updateDestination(id: string, p: DestinationPatch) {
    const patch: Row = {};
    for (const [k, v] of Object.entries(p)) if (v !== undefined) patch[k] = v;
    const r = await this.db.from('destinations').update(patch).eq('id', id).select('*').maybeSingle();
    return r.data ? toDest(r.data) : null;
  }
  async getSettings(): Promise<PlatformSettings> {
    const r = await this.db.from('platform_settings').select('maintenance_banner, inquiries_enabled, ai_enabled, partner_applications_open').eq('id', true).maybeSingle();
    return { ...DEFAULT_SETTINGS, ...(r.data ?? {}) };
  }
  async updateSettings(patch: Partial<PlatformSettings>) {
    must(await this.db.from('platform_settings').update(patch).eq('id', true));
    return this.getSettings();
  }

  // ----- AI history -----
  async saveConversation(userId: string, id: string | null, lang: string, turns: { role: 'user' | 'assistant'; content: string }[]): Promise<ConversationRow> {
    let convId = id;
    if (convId && !(await this.db.from('ai_conversations').select('id').eq('id', convId).eq('user_id', userId).maybeSingle()).data) convId = null;
    if (!convId) {
      const title = turns.find((t) => t.role === 'user')?.content.slice(0, 80) ?? '';
      convId = (must(await this.db.from('ai_conversations').insert({ user_id: userId, title, lang }).select('id').single()) as Row).id as string;
    } else {
      await this.db.from('ai_conversations').update({ lang }).eq('id', convId);
    }
    const existing = must(await this.db.from('ai_messages').select('id', { count: 'exact', head: false }).eq('conversation_id', convId)) as Row[];
    const fresh = turns.slice(existing.length);
    if (fresh.length) must(await this.db.from('ai_messages').insert(fresh.map((t) => ({ conversation_id: convId, role: t.role, content: t.content.slice(0, 8000) }))));
    return (await this.getConversation(userId, convId))!;
  }
  async listConversations(userId: string) {
    const rows = must(await this.db.from('ai_conversations').select('id, user_id, title, lang, created_at, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(100)) as Row[];
    return rows.map((r) => ({ ...(r as ConversationRow), messages: [] }));
  }
  async getConversation(userId: string, id: string) {
    const c = (await this.db.from('ai_conversations').select('id, user_id, title, lang, created_at, updated_at').eq('id', id).eq('user_id', userId).maybeSingle()).data as Row | null;
    if (!c) return null;
    const msgs = must(await this.db.from('ai_messages').select('role, content, created_at').eq('conversation_id', id).order('id')) as Row[];
    return { ...(c as ConversationRow), messages: msgs.map((m) => ({ role: m.role, content: m.content, at: m.created_at })) };
  }
  async deleteConversation(userId: string, id: string) {
    return ((await this.db.from('ai_conversations').delete().eq('id', id).eq('user_id', userId).select('id')).data?.length ?? 0) > 0;
  }

  async insertEvent(e: EventRow) {
    await (this.svc ?? this.db).from('analytics_events').insert({ type: e.type, props: e.props ?? {}, user_id: isUuid(e.user_id) ? e.user_id : null, session_id: e.session_id, created_at: e.created_at });
  }
  async events(since: string) {
    return must(await this.db.from('analytics_events').select('type, created_at, user_id, session_id, props').gte('created_at', since).limit(50000)) as EventRow[];
  }
  async bookings(since: string) {
    return (must(await this.db.from('bookings').select('*').gte('created_at', since)) as Row[]).map(toBooking);
  }
}
const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);
