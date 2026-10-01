-- 0004: payment architecture (no provider wired yet) + guarantee a clean production start.

-- ---------- Payments ----------
-- Booking lifecycle stays in booking_status (pending/confirmed/rejected/cancelled/completed).
-- Money lifecycle is separate and explicit. Nothing is ever "paid" without a provider webhook.
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');

alter table public.bookings
  add column if not exists payment_status public.payment_status;  -- null = no payment requested (inquiry only)

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  provider text not null check (provider in ('stripe', 'paybox', 'manual_test')),
  provider_ref text,                                   -- provider's payment/intent id, set by webhook
  is_test boolean not null default true,               -- sandbox payments can never count as revenue
  status public.payment_status not null default 'pending',
  amount_usd numeric(10, 2) not null check (amount_usd >= 0),
  currency char(3) not null default 'USD',
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index payments_booking on public.payments (booking_id);
create index payments_status_time on public.payments (status, created_at desc);
create trigger trg_payments_touch before update on public.payments for each row execute function public.touch_updated_at();

alter table public.payments enable row level security;
-- Traveller sees own; partner sees payments for their bookings; admin sees all.
create policy payments_read on public.payments for select using (
  public.is_admin()
  or exists (select 1 from public.bookings b where b.id = booking_id
             and (b.traveler_id = auth.uid() or b.partner_id in (select public.my_partner_ids())))
);
-- No insert/update policy for normal roles: only the service role (webhook handler) writes payments.

-- Real revenue = paid, non-test payments only.
create or replace view public.platform_revenue as
  select coalesce(sum(amount_usd), 0)::numeric(12, 2) as revenue_usd, count(*) as paid_count
  from public.payments where status = 'paid' and not is_test;
revoke all on public.platform_revenue from anon, authenticated;

-- ---------- Clean production start ----------
-- Removes every sample/demo record that older seeds inserted. Curated destinations are untouched.
delete from public.booking_messages where booking_id in (select b.id from public.bookings b join public.listings l on l.id = b.listing_id where l.is_demo);
delete from public.booking_events   where booking_id in (select b.id from public.bookings b join public.listings l on l.id = b.listing_id where l.is_demo);
delete from public.reviews          where listing_id in (select id from public.listings where is_demo);
delete from public.bookings         where listing_id in (select id from public.listings where is_demo);
delete from public.media            where owner_type = 'listing' and owner_id in (select id from public.listings where is_demo);
delete from public.favorites        where target_type = 'listing' and target_id in (select id from public.listings where is_demo);
delete from public.listings         where is_demo;
delete from public.partner_members  where partner_id in (select id from public.partners where is_demo);
delete from public.partners         where is_demo;
delete from public.analytics_events where props ? 'demo';
