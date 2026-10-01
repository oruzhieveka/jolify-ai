-- Row Level Security on EVERY table, role helpers, guards and RPCs.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.my_partner_ids() returns setof text language sql stable security definer set search_path = public as $$
  select partner_id from public.partner_members where user_id = auth.uid();
$$;

-- Trusted contexts: admins, the service role (server) and migrations/seed (postgres).
create or replace function public.is_privileged() returns boolean language sql stable as $$
  select public.is_admin() or coalesce(auth.role(), '') = 'service_role' or current_user in ('postgres', 'supabase_admin');
$$;

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.partners enable row level security;
alter table public.partner_members enable row level security;
alter table public.partner_applications enable row level security;
alter table public.consents enable row level security;
alter table public.listings enable row level security;
alter table public.media enable row level security;
alter table public.trips enable row level security;
alter table public.favorites enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.booking_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.analytics_events enable row level security;

-- profiles
create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.guard_profile_role() returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and not public.is_privileged() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;
create trigger trg_profile_role before update on public.profiles for each row execute function public.guard_profile_role();

-- destinations: public read, admin write
create policy destinations_read on public.destinations for select using (published or public.is_admin());
create policy destinations_admin on public.destinations for all using (public.is_admin()) with check (public.is_admin());

-- partners
create policy partners_read on public.partners for select using (true);
create policy partners_update_member on public.partners for update using (id in (select public.my_partner_ids())) with check (id in (select public.my_partner_ids()));
create policy partners_admin on public.partners for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.guard_partner_verified() returns trigger language plpgsql as $$
begin
  if (new.verified is distinct from old.verified or new.is_demo is distinct from old.is_demo) and not public.is_privileged() then
    raise exception 'Only admins can change verification';
  end if;
  return new;
end $$;
create trigger trg_partner_verified before update on public.partners for each row execute function public.guard_partner_verified();

create policy members_read on public.partner_members for select using (user_id = auth.uid() or public.is_admin());
create policy members_admin on public.partner_members for all using (public.is_admin()) with check (public.is_admin());

-- applications + consents
create policy apps_insert_self on public.partner_applications for insert with check (user_id = auth.uid() and status = 'submitted');
create policy apps_read on public.partner_applications for select using (user_id = auth.uid() or public.is_admin());
create policy apps_admin_update on public.partner_applications for update using (public.is_admin()) with check (public.is_admin());

create policy consents_insert_self on public.consents for insert with check (user_id = auth.uid());
create policy consents_read on public.consents for select using (user_id = auth.uid() or public.is_admin());
-- no update/delete policies: the ledger is append-only. Withdrawal = new row with status 'withdrawn'.

-- listings
create policy listings_read on public.listings for select using (
  status = 'approved' or partner_id in (select public.my_partner_ids()) or public.is_admin());
create policy listings_insert_member on public.listings for insert with check (partner_id in (select public.my_partner_ids()));
create policy listings_update_member on public.listings for update using (partner_id in (select public.my_partner_ids())) with check (partner_id in (select public.my_partner_ids()));
create policy listings_delete_member on public.listings for delete using (partner_id in (select public.my_partner_ids()) and status <> 'approved');
create policy listings_admin on public.listings for all using (public.is_admin()) with check (public.is_admin());
-- Partners can never self-approve; any edit sends the listing back to review.
create or replace function public.guard_listing_status() returns trigger language plpgsql as $$
begin
  if not public.is_privileged() then
    if new.status not in ('draft', 'pending_review') then new.status := 'pending_review'; end if;
    if tg_op = 'UPDATE' then new.status := case when new.status = 'draft' then 'draft' else 'pending_review' end; new.is_demo := old.is_demo; end if;
    if tg_op = 'INSERT' then new.is_demo := false; end if;
  end if;
  return new;
end $$;
create trigger trg_listing_status before insert or update on public.listings for each row execute function public.guard_listing_status();

-- media
create policy media_read on public.media for select using (
  owner_type = 'destination'
  or (owner_type = 'listing' and exists (select 1 from public.listings l where l.id = owner_id and (l.status = 'approved' or l.partner_id in (select public.my_partner_ids()))))
  or (owner_type = 'partner' and true)
  or public.is_admin());
create policy media_write_member on public.media for all using (
  public.is_admin()
  or (owner_type = 'listing' and exists (select 1 from public.listings l where l.id = owner_id and l.partner_id in (select public.my_partner_ids())))
  or (owner_type = 'partner' and owner_id in (select public.my_partner_ids()))
) with check (
  public.is_admin()
  or (owner_type = 'listing' and exists (select 1 from public.listings l where l.id = owner_id and l.partner_id in (select public.my_partner_ids())))
  or (owner_type = 'partner' and owner_id in (select public.my_partner_ids()))
);

-- trips + favorites: owner only
create policy trips_owner on public.trips for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favorites_owner on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- bookings: travellers create pending requests; status changes ONLY via change_booking_status()
create policy bookings_read on public.bookings for select using (
  traveler_id = auth.uid() or partner_id in (select public.my_partner_ids()) or public.is_admin());
create policy bookings_insert_traveler on public.bookings for insert with check (
  traveler_id = auth.uid() and status = 'pending'
  and exists (select 1 from public.listings l where l.id = listing_id and l.partner_id = bookings.partner_id and l.status = 'approved'));

create policy booking_events_read on public.booking_events for select using (
  exists (select 1 from public.bookings b where b.id = booking_id and (b.traveler_id = auth.uid() or b.partner_id in (select public.my_partner_ids()) or public.is_admin())));

create policy booking_messages_read on public.booking_messages for select using (
  exists (select 1 from public.bookings b where b.id = booking_id and (b.traveler_id = auth.uid() or b.partner_id in (select public.my_partner_ids()) or public.is_admin())));
create policy booking_messages_insert on public.booking_messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.bookings b where b.id = booking_id and (b.traveler_id = auth.uid() or b.partner_id in (select public.my_partner_ids()))));

create or replace function public.change_booking_status(p_booking uuid, p_to public.booking_status, p_note text default null)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare b public.bookings; actor text;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'not found'; end if;
  actor := case when public.is_admin() then 'admin'
                when b.partner_id in (select public.my_partner_ids()) then 'partner'
                when b.traveler_id = auth.uid() then 'traveler' end;
  if actor is null then raise exception 'forbidden'; end if;
  -- Mirrors src/core/bookings.ts TRANSITIONS
  if not (
    (b.status = 'pending' and p_to in ('confirmed', 'rejected') and actor in ('partner', 'admin')) or
    (b.status = 'pending' and p_to = 'cancelled') or
    (b.status = 'confirmed' and p_to = 'cancelled') or
    (b.status = 'confirmed' and p_to = 'completed' and actor in ('partner', 'admin'))
  ) then raise exception 'invalid transition % -> % as %', b.status, p_to, actor; end if;
  insert into public.booking_events (booking_id, from_status, to_status, actor_id, note) values (b.id, b.status, p_to, auth.uid(), p_note);
  update public.bookings set status = p_to where id = b.id returning * into b;
  return b;
end $$;

-- Booking creation also logs the first event.
create or replace function public.log_booking_created() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.booking_events (booking_id, from_status, to_status, actor_id) values (new.id, null, new.status, new.traveler_id);
  return new;
end $$;
create trigger trg_booking_created after insert on public.bookings for each row execute function public.log_booking_created();

-- reviews: only the traveller of a completed booking
create policy reviews_read on public.reviews for select using (true);
create policy reviews_insert on public.reviews for insert with check (
  author_id = auth.uid() and exists (select 1 from public.bookings b where b.id = booking_id and b.traveler_id = auth.uid() and b.status = 'completed' and b.listing_id = reviews.listing_id));
create policy reviews_partner_reply on public.reviews for update using (
  exists (select 1 from public.listings l where l.id = listing_id and l.partner_id in (select public.my_partner_ids())));

-- analytics: written by the server (service role); readable by admins only
create policy analytics_admin_read on public.analytics_events for select using (public.is_admin());

-- Admin approves an application: creates the partner and membership atomically.
create or replace function public.approve_partner_application(p_app uuid, p_decision public.application_status)
returns text language plpgsql security definer set search_path = public as $$
declare a public.partner_applications; pid text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into a from public.partner_applications where id = p_app for update;
  if not found or a.status <> 'submitted' then raise exception 'application not pending'; end if;
  if p_decision = 'approved' then
    insert into public.partners (name, category, city, description, phone, email, website)
    values (a.data ->> 'business_name', (a.data ->> 'category')::public.partner_category, a.data ->> 'city',
            a.data ->> 'description', a.data ->> 'phone', a.data ->> 'email', nullif(a.data ->> 'website', ''))
    returning id into pid;
    insert into public.partner_members (partner_id, user_id) values (pid, a.user_id);
    update public.profiles set role = 'partner' where id = a.user_id and role = 'traveler';
  end if;
  update public.partner_applications set status = p_decision, partner_id = pid, reviewed_by = auth.uid(), reviewed_at = now() where id = a.id;
  return pid;
end $$;
