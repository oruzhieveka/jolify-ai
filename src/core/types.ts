// Domain types shared by server, client and tests. Framework-free on purpose:
// this folder must run under plain Node (type stripping) for unit tests.

export const LANGS = ['en', 'ru', 'ky'] as const;
export type Lang = (typeof LANGS)[number];
export type Localized = { en: string; ru?: string; ky?: string };

export const PRICE_UNITS = [
  'room-night', 'person', 'person-meal', 'person-day', 'person-night',
  'vehicle-day', 'vehicle-trip', 'car-day', 'guide-day',
] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export const LISTING_CATEGORIES = [
  'hotel', 'guesthouse', 'yurt', 'restaurant', 'tour', 'guide', 'transport', 'car', 'experience',
] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

/** Marketplace sections shown to travellers. */
export const MARKET_SECTIONS = {
  stay: ['hotel', 'guesthouse', 'yurt'],
  eat: ['restaurant'],
  tours: ['tour'],
  guides: ['guide'],
  transport: ['transport', 'car'],
  experiences: ['experience'],
} as const satisfies Record<string, readonly ListingCategory[]>;
export type MarketSection = keyof typeof MARKET_SECTIONS;

/** The 8 partner categories a business can apply under. */
export const PARTNER_CATEGORIES = [
  'accommodation', 'restaurant', 'tour_operator', 'guide', 'transport', 'car_rental', 'experience', 'other',
] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const LISTING_STATUSES = ['draft', 'pending_review', 'approved', 'rejected', 'suspended'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export type Zone = 'hub' | 'north' | 'south' | 'remote' | 'west';

export interface DestinationDetails {
  history?: string;
  culture?: string;
  howToGetThere?: string;
  altitudeM?: number;
  nearby?: string[]; // destination ids
  safety?: string;
}

export interface Destination {
  id: string; // slug
  name: Localized;
  region: string;
  lat: number;
  lon: number;
  season: string;
  duration: string;
  difficulty: string | null;
  budgetPerDayUsd: number;
  tags: string[];
  activities: string[];
  description: Localized;
  tips: string[];
  order: number; // west->east routing order used by the planner
  popularity: number;
  zone: Zone;
  dayTitle: string;
  details?: DestinationDetails;
  /** Curated per-language overrides written by editors (never machine-translated at runtime). */
  i18n?: Partial<Record<'ru' | 'ky', { activities?: string[]; tips?: string[]; dayTitle?: string; details?: Partial<Omit<DestinationDetails, 'altitudeM' | 'nearby'>> }>>;
  published?: boolean;
}

export interface Listing {
  id: string;
  partnerId: string;
  category: ListingCategory;
  title: string;
  destinationId: string;
  priceUsd: number;
  unit: PriceUnit;
  tags: string[];
  description: string;
  status: ListingStatus;
  isDemo: boolean;
  lat?: number | null;
  lon?: number | null;
}

export interface Partner {
  id: string;
  name: string;
  category: PartnerCategory;
  city: string;
  verified: boolean;
  isDemo: boolean;
}

/** Full business profile (partner-editable fields + admin flags). */
export interface PartnerProfile extends Partner {
  description: string;
  destinationId: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
  social: { instagram: string; facebook: string; telegram: string; whatsapp: string };
  openingHours: Record<string, { closed: boolean; open: string; close: string } | null> | null;
  services: string[];
  amenities: string[];
  priceNote: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

// ---------- itinerary (the structured AI output contract) ----------
export interface ItineraryItem {
  listing_id: string | null; // null only for free, self-guided activities
  name: string;
  category: string;
  cost: number; // USD for the whole group
  from?: string;
  to?: string;
  location?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  location: string; // destination id
  coordinates: [number, number];
  activities: ItineraryItem[];
  restaurants: ItineraryItem[];
  accommodation: ItineraryItem | null;
  transportation: ItineraryItem[];
  estimated_cost: number;
  notes: string[];
}

export type Interest =
  | 'mountains' | 'horses' | 'food' | 'photo' | 'lake' | 'culture'
  | 'adventure' | 'relax' | 'nomad' | 'hiking';

export interface TripRequest {
  raw: string;
  days: number | null;
  budget: number | null;
  travelers: number;
  interests: Interest[];
  arrival: 'bishkek' | 'osh';
  style: 'budget' | 'balanced' | 'comfort';
  mentions: string[];
  month: number | null;
  startDate: string | null; // ISO date if the user gave one
}

export interface Itinerary {
  schema_version: '1.0';
  trip_title: string;
  summary: string;
  language: Lang;
  request: TripRequest;
  travelers: number;
  budget_target: number | null;
  estimated_budget: { amount: number; currency: 'USD' };
  days: ItineraryDay[];
  practical_info: string[];
  generated_by: string;
  created_at: string;
  updated_at?: string;
}

// ---------- bookings ----------
export const BOOKING_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type Role = 'traveler' | 'partner' | 'admin';
export const ROLES = ['traveler', 'partner', 'admin'] as const;

// ---------- payments (no provider connected: rows only come from a provider webhook) ----------
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
