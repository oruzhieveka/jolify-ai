import { Catalog } from '../core/catalog.ts';
import { DESTINATIONS, DEMO_LISTINGS, DEMO_PARTNERS } from '../core/seed/index.ts';
import type { BookingStatus, Destination, Itinerary, Listing, ListingStatus, Partner, PartnerProfile, Role } from '../core/types.ts';
import type { MediaOwnerType, MediaRow } from '../core/media.ts';
import { withCover } from '../core/media.ts';
import type { PartnerProfileInput } from '../core/partner-profile.ts';
import type { ConsentRecord, PartnerApplicationInput } from '../core/consent.ts';
import type { ListingInput } from '../core/listing-schema.ts';
import type { EventRow } from '../core/analytics.ts';
import { DEFAULT_SETTINGS } from './repo.ts';
import type { ApplicationRow, BookingEvent, BookingMessage, BookingRecord, ConversationRow, DestinationInput, DestinationPatch, ListingQuery, PaymentRow, PlatformSettings, ProfileRow, Repo, TripRow } from './repo.ts';

export const toProfile = (p: Partner, extra: Partial<PartnerProfile> = {}): PartnerProfile => ({
  ...p, description: '', destinationId: null, address: '', phone: '', email: '', website: '',
  social: { instagram: '', facebook: '', telegram: '', whatsapp: '' }, openingHours: null, services: [], amenities: [], priceNote: '',
  status: 'active', createdAt: new Date().toISOString(), ...extra,
});

let seq = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;
const now = () => new Date().toISOString();

/** In-process store for DEMO_MODE and tests. Not durable; resets on server restart. */
export class MemoryRepo implements Repo {
  readonly kind = 'memory' as const;
  /** seedDemo=false gives the production starting state: destinations only, zero transactional data. */
  constructor(opts: { seedDemo?: boolean } = {}) {
    const demo = opts.seedDemo ?? true;
    this.listings = demo ? DEMO_LISTINGS.map((l) => ({ ...l, tags: [...l.tags] })) : [];
    this.partnerRows = demo ? DEMO_PARTNERS.map((p) => toProfile(p)) : [];
  }
  listings: Listing[];
  destinations: Destination[] = DESTINATIONS.map((d) => ({ ...d, published: true }));
  media: MediaRow[] = [];
  profiles: ProfileRow[] = [];
  paymentRows: PaymentRow[] = [];
  settings: PlatformSettings = { ...DEFAULT_SETTINGS };
  conversations: ConversationRow[] = [];
  trips: TripRow[] = [];
  bookingRows: BookingRecord[] = [];
  bookingEventRows: BookingEvent[] = [];
  messages: BookingMessage[] = [];
  applications: ApplicationRow[] = [];
  consents: ConsentRecord[] = [];
  partnerMembers: { user_id: string; partner_id: string }[] = [];
  eventRows: EventRow[] = [];

  async catalog() { return new Catalog(this.destinations.filter((d) => d.published !== false), this.listings); }
  async listing(id: string) { return this.listings.find((l) => l.id === id) ?? null; }
  partnerRows: PartnerProfile[];
  async partners(): Promise<Partner[]> { return this.partnerRows.filter((p) => p.status === 'active'); }
  async searchListings(f: ListingQuery) {
    const q = f.q?.trim().toLowerCase();
    const live = new Set(this.partnerRows.filter((p) => p.status === 'active').map((p) => p.id));
    let out = this.listings.filter((l) => l.status === 'approved' && live.has(l.partnerId) && f.categories.includes(l.category) && (!f.destinationId || l.destinationId === f.destinationId) && (!f.maxPrice || l.priceUsd <= f.maxPrice) && (!q || (l.title + ' ' + l.description + ' ' + l.tags.join(' ')).toLowerCase().includes(q)));
    if (f.sort === 'price') out = [...out].sort((a, b) => a.priceUsd - b.priceUsd); else if (f.sort === 'price-desc') out = [...out].sort((a, b) => b.priceUsd - a.priceUsd);
    return out.slice(0, f.limit ?? 60);
  }
  async listingsByStatus(status: ListingStatus) { return this.listings.filter((l) => l.status === status); }

  async saveTrip(userId: string, it: Itinerary) {
    const row: TripRow = { id: uid('trip'), user_id: userId, title: it.trip_title, itinerary: it, created_at: now(), updated_at: now() };
    this.trips.push(row);
    return row;
  }
  async updateTrip(userId: string, id: string, it: Itinerary) {
    const t = this.trips.find((x) => x.id === id && x.user_id === userId);
    if (!t) return null;
    Object.assign(t, { itinerary: it, title: it.trip_title, updated_at: now() });
    return t;
  }
  async listTrips(userId: string) { return this.trips.filter((t) => t.user_id === userId); }
  async getTrip(userId: string, id: string) { return this.trips.find((t) => t.id === id && t.user_id === userId) ?? null; }
  async deleteTrip(userId: string, id: string) {
    const n = this.trips.length;
    this.trips = this.trips.filter((t) => !(t.id === id && t.user_id === userId));
    return this.trips.length < n;
  }

  async createBooking(b: Omit<BookingRecord, 'id' | 'created_at' | 'updated_at'>) {
    const row: BookingRecord = { ...b, id: uid('bk'), created_at: now(), updated_at: now() };
    this.bookingRows.push(row);
    this.bookingEventRows.push({ booking_id: row.id, from_status: null, to_status: row.status, actor_id: b.traveler_id, note: null, created_at: row.created_at });
    return row;
  }
  async getBooking(id: string) { return this.bookingRows.find((b) => b.id === id) ?? null; }
  async setBookingStatus(id: string, to: BookingStatus, actorId: string, note: string | null) {
    const b = this.bookingRows.find((x) => x.id === id);
    if (!b) throw new Error('not found');
    this.bookingEventRows.push({ booking_id: id, from_status: b.status, to_status: to, actor_id: actorId, note, created_at: now() });
    b.status = to; b.updated_at = now();
    return b;
  }
  async bookingEvents(id: string) { return this.bookingEventRows.filter((e) => e.booking_id === id); }
  async addBookingMessage(bookingId: string, senderId: string, body: string) {
    const m = { id: uid('msg'), booking_id: bookingId, sender_id: senderId, body, created_at: now() };
    this.messages.push(m);
    return m;
  }
  async bookingMessages(bookingId: string) { return this.messages.filter((m) => m.booking_id === bookingId); }
  async bookingsForTraveler(userId: string) { return this.bookingRows.filter((b) => b.traveler_id === userId); }
  async bookingsForPartners(ids: string[]) { return this.bookingRows.filter((b) => ids.includes(b.partner_id)); }

  async partnerIdsForUser(userId: string) { return this.partnerMembers.filter((m) => m.user_id === userId).map((m) => m.partner_id); }
  async createApplication(userId: string, data: PartnerApplicationInput, consents: ConsentRecord[]) {
    const row: ApplicationRow = { id: uid('app'), user_id: userId, status: 'submitted', data, created_at: now() };
    this.applications.push(row);
    this.consents.push(...consents);
    return row;
  }
  async listApplications(status?: ApplicationRow['status']) { return this.applications.filter((a) => !status || a.status === status); }
  async decideApplication(id: string, decision: 'approved' | 'rejected') {
    const a = this.applications.find((x) => x.id === id);
    if (!a) throw new Error('not found');
    a.status = decision;
    let partnerId: string | null = null;
    if (decision === 'approved') {
      partnerId = uid('p');
      this.partnerMembers.push({ user_id: a.user_id, partner_id: partnerId });
      // Approval creates the account; verification is a separate, explicit admin action.
      this.partnerRows.push(toProfile({ id: partnerId, name: a.data.business_name, category: a.data.category, city: a.data.city, verified: false, isDemo: false }));
      const prof = this.profiles.find((x) => x.id === a.user_id); if (prof && prof.role === 'traveler') prof.role = 'partner';
    }
    return { application: a, partnerId };
  }
  async createListing(partnerId: string, input: ListingInput, status: 'draft' | 'pending_review' = 'pending_review') {
    const l: Listing = {
      id: uid('l'), partnerId, category: input.category, title: input.title, destinationId: input.destination_id,
      priceUsd: input.price_usd, unit: input.price_unit, tags: input.tags ?? [], description: input.description,
      status, isDemo: false, lat: input.lat ?? null, lon: input.lon ?? null,
    };
    this.listings.push(l);
    return l;
  }
  async updateListing(partnerId: string, id: string, input: Partial<ListingInput>) {
    const l = this.listings.find((x) => x.id === id && x.partnerId === partnerId);
    if (!l) return null;
    if (input.title) l.title = input.title;
    if (input.description) l.description = input.description;
    if (input.price_usd) l.priceUsd = input.price_usd;
    if (input.price_unit) l.unit = input.price_unit;
    if (input.tags) l.tags = input.tags;
    if (input.category) l.category = input.category;
    if (input.destination_id) l.destinationId = input.destination_id;
    if (input.lat !== undefined) l.lat = input.lat; if (input.lon !== undefined) l.lon = input.lon;
    if (l.status !== 'draft') l.status = 'pending_review'; // any edit of a live listing goes back to review
    return l;
  }
  async listingsForPartners(ids: string[]) { return this.listings.filter((l) => ids.includes(l.partnerId)); }
  async setListingStatus(id: string, status: ListingStatus) {
    const l = this.listings.find((x) => x.id === id);
    if (!l) return null;
    l.status = status;
    return l;
  }

  // ----- partner profile -----
  async getPartner(id: string) { return this.partnerRows.find((p) => p.id === id) ?? null; }
  async updatePartnerProfile(id: string, i: PartnerProfileInput) {
    const p = this.partnerRows.find((x) => x.id === id);
    if (!p) return null;
    Object.assign(p, { name: i.name, category: i.category, description: i.description, destinationId: i.destination_id, city: i.city, address: i.address, phone: i.phone, email: i.email, website: i.website, social: i.social, openingHours: i.opening_hours, services: i.services, amenities: i.amenities, priceNote: i.price_note });
    return p;
  }
  async deleteListing(partnerId: string, id: string) {
    const n = this.listings.length;
    this.listings = this.listings.filter((l) => !(l.id === id && l.partnerId === partnerId && l.status !== 'approved'));
    if (this.listings.length < n) { this.media = this.media.filter((m) => !(m.owner_type === 'listing' && m.owner_id === id)); return true; }
    return false;
  }
  async submitListing(partnerId: string, id: string) {
    const l = this.listings.find((x) => x.id === id && x.partnerId === partnerId);
    if (!l || !['draft', 'rejected'].includes(l.status)) return null;
    l.status = 'pending_review';
    return l;
  }

  // ----- media -----
  async listMedia(t: MediaOwnerType, id: string) { return this.media.filter((m) => m.owner_type === t && m.owner_id === id).sort((a, b) => a.position - b.position); }
  async getMedia(id: string) { return this.media.find((m) => m.id === id) ?? null; }
  async addMedia(row: Omit<MediaRow, 'created_at'>) { const m = { ...row, created_at: now() }; this.media.push(m); return m; }
  async updateMedia(id: string, patch: { alt?: string | null; caption?: string | null }) {
    const m = this.media.find((x) => x.id === id); if (!m) return null;
    if (patch.alt !== undefined) m.alt = patch.alt; if (patch.caption !== undefined) m.caption = patch.caption;
    return m;
  }
  async deleteMedia(id: string) { const n = this.media.length; this.media = this.media.filter((m) => m.id !== id); return this.media.length < n; }
  async saveMediaOrder(rows: MediaRow[]) {
    for (const r of rows) { const m = this.media.find((x) => x.id === r.id); if (m) { m.position = r.position; m.is_cover = r.is_cover; } }
    return rows.length ? this.listMedia(rows[0].owner_type, rows[0].owner_id) : [];
  }
  async coverPhotos(t: MediaOwnerType, ids: string[]) {
    return ids.flatMap((id) => withCover(this.media.filter((m) => m.owner_type === t && m.owner_id === id)).filter((m) => m.is_cover));
  }

  // ----- admin -----
  async listProfiles() { return [...this.profiles].sort((a, b) => b.created_at.localeCompare(a.created_at)); }
  async setUserRole(userId: string, role: Role) { const p = this.profiles.find((x) => x.id === userId); if (!p) return null; p.role = role; return p; }
  async listPartnerProfiles() { return this.partnerRows; }
  async setPartnerFlags(id: string, f: { verified?: boolean; status?: 'active' | 'suspended' }) {
    const p = this.partnerRows.find((x) => x.id === id); if (!p) return null;
    if (f.verified !== undefined) p.verified = f.verified; if (f.status) p.status = f.status;
    return p;
  }
  async allListings() { return this.listings; }
  async allBookings() { return [...this.bookingRows].sort((a, b) => b.created_at.localeCompare(a.created_at)); }
  async payments() { return this.paymentRows; }
  async allDestinations() { return this.destinations; }
  async createDestination(input: DestinationInput) {
    const d: Destination = { ...input, tags: [...input.tags], activities: [...input.activities], tips: [...input.tips], details: { ...(input.details ?? {}) }, i18n: input.i18n ?? {} };
    this.destinations.push(d);
    this.destinations.sort((a, b) => a.order - b.order);
    return d;
  }
  async updateDestination(id: string, patch: DestinationPatch) {
    const d = this.destinations.find((x) => x.id === id); if (!d) return null;
    Object.assign(d, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    return d;
  }
  async getSettings() { return this.settings; }
  async updateSettings(patch: Partial<PlatformSettings>) { this.settings = { ...this.settings, ...patch }; return this.settings; }

  async saveConversation(userId: string, id: string | null, lang: string, turns: { role: 'user' | 'assistant'; content: string }[]) {
    const at = now();
    let c = id ? this.conversations.find((x) => x.id === id && x.user_id === userId) : undefined;
    if (!c) { c = { id: uid('conv'), user_id: userId, title: turns.find((t) => t.role === 'user')?.content.slice(0, 80) ?? '', lang, messages: [], created_at: at, updated_at: at }; this.conversations.push(c); }
    c.messages = turns.map((t) => ({ ...t, at })); c.lang = lang; c.updated_at = at;
    return c;
  }
  async listConversations(userId: string) { return this.conversations.filter((c) => c.user_id === userId).sort((a, b) => b.updated_at.localeCompare(a.updated_at)); }
  async getConversation(userId: string, id: string) { return this.conversations.find((c) => c.id === id && c.user_id === userId) ?? null; }
  async deleteConversation(userId: string, id: string) { const n = this.conversations.length; this.conversations = this.conversations.filter((c) => !(c.id === id && c.user_id === userId)); return this.conversations.length < n; }

  async insertEvent(e: EventRow) { this.eventRows.push(e); if (this.eventRows.length > 50000) this.eventRows.shift(); }
  async events(since: string) { return this.eventRows.filter((e) => e.created_at >= since); }
  async bookings(since: string) { return this.bookingRows.filter((b) => b.created_at >= since); }
}
