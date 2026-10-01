-- JOLIFY AI: core schema. Source of truth for every price, listing and business detail.
create extension if not exists pgcrypto;

create type public.user_role as enum ('traveler', 'partner', 'admin');
create type public.listing_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'suspended');
create type public.listing_category as enum ('hotel', 'guesthouse', 'yurt', 'restaurant', 'tour', 'guide', 'transport', 'car', 'experience');
create type public.price_unit as enum ('room-night', 'person', 'person-meal', 'person-day', 'person-night', 'vehicle-day', 'vehicle-trip', 'car-day', 'guide-day');
create type public.partner_category as enum ('accommodation', 'restaurant', 'tour_operator', 'guide', 'transport', 'car_rental', 'experience', 'other');
create type public.booking_status as enum ('pending', 'confirmed', 'rejected', 'cancelled', 'completed');
create type public.application_status as enum ('submitted', 'approved', 'rejected');
create type public.consent_status as enum ('granted', 'declined', 'withdrawn');
create type public.media_owner as enum ('listing', 'partner', 'destination');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'traveler',
  full_name text,
  locale text not null default 'en' check (locale in ('en', 'ru', 'ky')),
  created_at timestamptz not null default now()
);

create table public.destinations (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name jsonb not null check (name ? 'en'),
  region text not null,
  lat double precision not null check (lat between 39 and 43.5),
  lon double precision not null check (lon between 69 and 80.5),
  season text, duration text, difficulty text,
  budget_per_day_usd numeric(10, 2),
  tags text[] not null default '{}',
  activities text[] not null default '{}',
  description jsonb not null default '{}'::jsonb,
  tips text[] not null default '{}',
  sort_order int not null default 0,
  popularity int not null default 0,
  zone text not null default 'north' check (zone in ('hub', 'north', 'south', 'remote', 'west')),
  day_title text not null,
  details jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.partners (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category public.partner_category not null,
  city text not null,
  description text,
  phone text, email text, website text,
  verified boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.partner_members (
  partner_id text not null references public.partners (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'staff')),
  primary key (partner_id, user_id)
);

create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.application_status not null default 'submitted',
  data jsonb not null,
  policy_version text not null,
  partner_id text references public.partners (id),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Append-only consent ledger (status, timestamp, policy version, user id).
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null check (consent_type in ('partner_terms', 'data_processing', 'listing_accuracy', 'marketing')),
  status public.consent_status not null,
  policy_version text not null,
  granted_at timestamptz not null default now(),
  application_id uuid references public.partner_applications (id),
  user_agent text
);

create table public.listings (
  id text primary key default gen_random_uuid()::text,
  partner_id text not null references public.partners (id) on delete cascade,
  category public.listing_category not null,
  title text not null check (length(title) between 3 and 120),
  destination_id text not null references public.destinations (id),
  price_usd numeric(10, 2) not null check (price_usd > 0),
  price_unit public.price_unit not null,
  tags text[] not null default '{}',
  description text not null,
  address text,
  lat double precision, lon double precision,
  availability_note text,
  status public.listing_status not null default 'pending_review',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_dest_status on public.listings (destination_id, status);
create index listings_partner on public.listings (partner_id);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_type public.media_owner not null,
  owner_id text not null,
  storage_path text not null unique,
  position int not null default 0,
  alt text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index media_owner on public.media (owner_type, owner_id, position);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  itinerary jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_user on public.trips (user_id, updated_at desc);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'destination')),
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.listings (id),
  partner_id text not null references public.partners (id),
  traveler_id uuid not null references auth.users (id),
  trip_id uuid references public.trips (id) on delete set null,
  status public.booking_status not null default 'pending',
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  guests int not null check (guests between 1 and 50),
  message text not null,
  total_usd numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_partner on public.bookings (partner_id, created_at desc);
create index bookings_traveler on public.bookings (traveler_id, created_at desc);

create table public.booking_events (
  id bigserial primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  actor_id uuid not null references auth.users (id),
  note text,
  created_at timestamptz not null default now()
);

create table public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id uuid not null references auth.users (id),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Reviews only from travellers with a completed booking (enforced by RLS).
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id),
  listing_id text not null references public.listings (id),
  author_id uuid not null references auth.users (id),
  rating int not null check (rating between 1 and 5),
  body text check (length(body) <= 2000),
  partner_reply text,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigserial primary key,
  type text not null,
  props jsonb not null default '{}'::jsonb,
  user_id uuid,
  session_id text,
  created_at timestamptz not null default now()
);
create index analytics_events_type_time on public.analytics_events (type, created_at desc);
create index analytics_events_time on public.analytics_events (created_at desc);

-- updated_at maintenance
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger trg_listings_touch before update on public.listings for each row execute function public.touch_updated_at();
create trigger trg_trips_touch before update on public.trips for each row execute function public.touch_updated_at();
create trigger trg_bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();

-- profile on signup
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
