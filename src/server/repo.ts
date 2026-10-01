import type { Catalog } from '../core/catalog.ts';
import type { BookingStatus, Destination, Itinerary, Listing, ListingStatus, Localized, Partner, PartnerProfile, PaymentStatus, Role } from '../core/types.ts';
import type { MediaOwnerType, MediaRow } from '../core/media.ts';
import type { PartnerProfileInput } from '../core/partner-profile.ts';
import type { ConsentRecord, PartnerApplicationInput } from '../core/consent.ts';
import type { ListingInput } from '../core/listing-schema.ts';
import type { EventRow } from '../core/analytics.ts';

export interface SessionUser { id: string; role: Role; email?: string }

export interface TripRow { id: string; user_id: string; title: string; itinerary: Itinerary; created_at: string; updated_at: string }

export interface BookingRecord {
  id: string; listing_id: string; partner_id: string; traveler_id: string; trip_id: string | null;
  status: BookingStatus; start_date: string; end_date: string | null; guests: number; message: string;
  total_usd: number; created_at: string; updated_at: string;
}
export interface BookingEvent { booking_id: string; from_status: BookingStatus | null; to_status: BookingStatus; actor_id: string; note: string | null; created_at: string }
export interface BookingMessage { id: string; booking_id: string; sender_id: string; body: string; created_at: string }

export interface ProfileRow { id: string; email: string | null; full_name: string | null; role: Role; created_at: string }
export interface PaymentRow { id: string; booking_id: string; provider: string; provider_ref: string | null; is_test: boolean; status: PaymentStatus; amount_usd: number; currency: string; created_at: string }
export interface PlatformSettings { maintenance_banner: Localized | null; inquiries_enabled: boolean; ai_enabled: boolean; partner_applications_open: boolean }
export const DEFAULT_SETTINGS: PlatformSettings = { maintenance_banner: null, inquiries_enabled: true, ai_enabled: true, partner_applications_open: true };
export interface DestinationPatch { name?: Localized; description?: Localized; i18n?: Destination['i18n']; published?: boolean; season?: string; duration?: string }

export interface ConversationRow { id: string; user_id: string; title: string; lang: string; messages: { role: 'user' | 'assistant'; content: string; at: string }[]; created_at: string; updated_at: string }

export interface ListingQuery { categories: string[]; destinationId?: string | null; maxPrice?: number | null; q?: string | null; sort?: 'price' | 'price-desc' | null; limit?: number }

export interface ApplicationRow { id: string; user_id: string; status: 'submitted' | 'approved' | 'rejected'; data: PartnerApplicationInput; created_at: string }

/**
 * Data-access boundary. Two implementations:
 *  - SupabaseRepo (production; RLS enforced in Postgres)
 *  - MemoryRepo   (DEMO_MODE and tests; clearly labelled in the UI)
 * Handlers additionally check roles/ownership so both behave the same.
 */
export interface Repo {
  readonly kind: 'supabase' | 'memory';
  catalog(): Promise<Catalog>;
  listing(id: string): Promise<Listing | null>;
  partners(): Promise<Partner[]>;
  listingsByStatus(status: ListingStatus): Promise<Listing[]>;
  /** Approved listings matching filters, executed in the database (not in the browser). */
  searchListings(q: ListingQuery): Promise<Listing[]>;

  saveTrip(userId: string, it: Itinerary): Promise<TripRow>;
  updateTrip(userId: string, id: string, it: Itinerary): Promise<TripRow | null>;
  listTrips(userId: string): Promise<TripRow[]>;
  getTrip(userId: string, id: string): Promise<TripRow | null>;
  deleteTrip(userId: string, id: string): Promise<boolean>;

  createBooking(b: Omit<BookingRecord, 'id' | 'created_at' | 'updated_at'>): Promise<BookingRecord>;
  getBooking(id: string): Promise<BookingRecord | null>;
  setBookingStatus(id: string, to: BookingStatus, actorId: string, note: string | null): Promise<BookingRecord>;
  bookingEvents(id: string): Promise<BookingEvent[]>;
  addBookingMessage(bookingId: string, senderId: string, body: string): Promise<BookingMessage>;
  bookingMessages(bookingId: string): Promise<BookingMessage[]>;
  bookingsForTraveler(userId: string): Promise<BookingRecord[]>;
  bookingsForPartners(partnerIds: string[]): Promise<BookingRecord[]>;

  partnerIdsForUser(userId: string): Promise<string[]>;
  createApplication(userId: string, data: PartnerApplicationInput, consents: ConsentRecord[]): Promise<ApplicationRow>;
  listApplications(status?: ApplicationRow['status']): Promise<ApplicationRow[]>;
  decideApplication(id: string, decision: 'approved' | 'rejected', adminId: string): Promise<{ application: ApplicationRow; partnerId: string | null }>;
  createListing(partnerId: string, input: ListingInput, status?: 'draft' | 'pending_review'): Promise<Listing>;
  updateListing(partnerId: string, id: string, input: Partial<ListingInput>): Promise<Listing | null>;
  listingsForPartners(partnerIds: string[]): Promise<Listing[]>;
  setListingStatus(id: string, status: ListingStatus, adminId: string): Promise<Listing | null>;

  // ----- partner business profile -----
  getPartner(id: string): Promise<PartnerProfile | null>;
  updatePartnerProfile(id: string, p: PartnerProfileInput): Promise<PartnerProfile | null>;
  deleteListing(partnerId: string, id: string): Promise<boolean>;
  submitListing(partnerId: string, id: string): Promise<Listing | null>;

  // ----- photos (rows only; bytes live in a StorageAdapter) -----
  listMedia(ownerType: MediaOwnerType, ownerId: string): Promise<MediaRow[]>;
  getMedia(id: string): Promise<MediaRow | null>;
  addMedia(row: Omit<MediaRow, 'created_at'>): Promise<MediaRow>;
  updateMedia(id: string, patch: { alt?: string | null; caption?: string | null }): Promise<MediaRow | null>;
  deleteMedia(id: string): Promise<boolean>;
  /** Persists positions and the single cover flag for one owner. */
  saveMediaOrder(rows: MediaRow[]): Promise<MediaRow[]>;
  coverPhotos(ownerType: MediaOwnerType, ownerIds: string[]): Promise<MediaRow[]>;

  // ----- admin -----
  listProfiles(): Promise<ProfileRow[]>;
  setUserRole(userId: string, role: Role): Promise<ProfileRow | null>;
  listPartnerProfiles(): Promise<PartnerProfile[]>;
  setPartnerFlags(id: string, flags: { verified?: boolean; status?: 'active' | 'suspended' }): Promise<PartnerProfile | null>;
  allListings(): Promise<Listing[]>;
  allBookings(): Promise<BookingRecord[]>;
  payments(): Promise<PaymentRow[]>;
  allDestinations(): Promise<Destination[]>;
  updateDestination(id: string, patch: DestinationPatch): Promise<Destination | null>;
  getSettings(): Promise<PlatformSettings>;
  updateSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings>;

  // ----- AI assistant history (signed-in users only) -----
  saveConversation(userId: string, id: string | null, lang: string, turns: { role: 'user' | 'assistant'; content: string }[]): Promise<ConversationRow>;
  listConversations(userId: string): Promise<ConversationRow[]>;
  getConversation(userId: string, id: string): Promise<ConversationRow | null>;
  deleteConversation(userId: string, id: string): Promise<boolean>;

  insertEvent(e: EventRow): Promise<void>;
  events(sinceIso: string): Promise<EventRow[]>;
  bookings(sinceIso: string): Promise<BookingRecord[]>;
}
