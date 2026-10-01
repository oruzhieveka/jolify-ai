-- 0005: Partner Portal business profile, photo metadata + cover, curated content translations,
-- AI assistant history, platform settings, admin helpers. Apply after 0001-0004.

-- ---------- profiles: email copy for the admin Users page ----------
alter table public.profiles add column if not exists email text;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email) values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

-- Admin-only role changes through an audited RPC (profiles_update_self cannot change role: guard_profile_role).
create or replace function public.admin_set_role(p_user uuid, p_role public.user_role) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare r public.profiles;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'cannot demote self'; end if;
  update public.profiles set role = p_role where id = p_user returning * into r;
  return r;
end $$;

-- ---------- partners: full business profile ----------
alter table public.partners
  add column if not exists destination_id text references public.destinations (id),
  add column if not exists address text not null default '',
  add column if not exists social jsonb not null default '{}'::jsonb,
  add column if not exists opening_hours jsonb,
  add column if not exists services text[] not null default '{}',
  add column if not exists amenities text[] not null default '{}',
  add column if not exists price_note text not null default '',
  add column if not exists status text not null default 'active' check (status in ('active', 'suspended')),
  add column if not exists updated_at timestamptz not null default now();
alter table public.partners add constraint partners_website_https check (website is null or website = '' or website ~* '^https://');
create trigger trg_partners_touch before update on public.partners for each row execute function public.touch_updated_at();

-- Partners may not change verification, demo flag or status on their own row.
create or replace function public.guard_partner_admin_fields() returns trigger language plpgsql as $$
begin
  if not public.is_privileged() and (new.verified is distinct from old.verified or new.is_demo is distinct from old.is_demo or new.status is distinct from old.status) then
    raise exception 'only admins can change verified/is_demo/status';
  end if;
  return new;
end $$;
drop trigger if exists trg_partner_admin_fields on public.partners;
create trigger trg_partner_admin_fields before update on public.partners for each row execute function public.guard_partner_admin_fields();

-- Suspended partners' listings are hidden from the public read policy.
drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings for select using (
  (status = 'approved' and exists (select 1 from public.partners p where p.id = partner_id and p.status = 'active'))
  or partner_id in (select public.my_partner_ids()) or public.is_admin());

-- ---------- media: metadata, cover, attribution ----------
alter table public.media
  add column if not exists caption text check (caption is null or length(caption) <= 300),
  add column if not exists is_cover boolean not null default false,
  add column if not exists width int, add column if not exists height int,
  add column if not exists bytes int check (bytes is null or bytes <= 4194304),
  add column if not exists content_type text check (content_type is null or content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  add column if not exists author text, add column if not exists license text, add column if not exists source_url text check (source_url is null or source_url ~* '^https://');
alter table public.media add constraint media_alt_len check (alt is null or length(alt) <= 160);
create unique index if not exists media_one_cover on public.media (owner_type, owner_id) where is_cover;
-- Curated destination photos must be attributed.
alter table public.media add constraint media_destination_attribution check (owner_type <> 'destination' or (author is not null and license is not null));
-- Destination photos are admin-managed only (replace the 0002 write policy).
drop policy if exists media_write_member on public.media;
create policy media_write_member on public.media for all using (
  public.is_admin()
  or (owner_type = 'listing' and exists (select 1 from public.listings l where l.id = owner_id and l.partner_id in (select public.my_partner_ids())))
  or (owner_type = 'partner' and owner_id in (select public.my_partner_ids()))
) with check (
  public.is_admin()
  or (owner_type = 'listing' and exists (select 1 from public.listings l where l.id = owner_id and l.partner_id in (select public.my_partner_ids()))
      and storage_path like 'partners/' || (select l.partner_id from public.listings l where l.id = owner_id) || '/%')
  or (owner_type = 'partner' and owner_id in (select public.my_partner_ids()) and storage_path like 'partners/' || owner_id || '/%')
);

-- Atomic reorder + cover for one owner (RLS on media applies because this is SECURITY INVOKER).
create or replace function public.save_media_order(p_owner_type public.media_owner, p_owner_id text, p_ids uuid[], p_cover uuid)
returns setof public.media language plpgsql security invoker set search_path = public as $$
begin
  if (select count(*) from public.media where owner_type = p_owner_type and owner_id = p_owner_id) <> coalesce(array_length(p_ids, 1), 0)
     or exists (select 1 from unnest(p_ids) i where not exists (select 1 from public.media m where m.id = i and m.owner_type = p_owner_type and m.owner_id = p_owner_id))
  then raise exception 'order must contain every photo exactly once'; end if;
  update public.media set is_cover = false where owner_type = p_owner_type and owner_id = p_owner_id and is_cover;
  update public.media m set position = o.ord - 1, is_cover = (m.id = coalesce(p_cover, p_ids[1]))
    from unnest(p_ids) with ordinality as o(id, ord) where m.id = o.id;
  return query select * from public.media where owner_type = p_owner_type and owner_id = p_owner_id order by position;
end $$;

-- Storage: platform/ prefix for curated photos, admin-only writes.
create policy media_platform_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'media' and (storage.foldername(name))[1] = 'platform' and public.is_admin());
create policy media_platform_delete on storage.objects for delete to authenticated using (
  bucket_id = 'media' and (storage.foldername(name))[1] = 'platform' and public.is_admin());
-- Tighten the bucket to the post-optimisation size limit (4 MB).
update storage.buckets set file_size_limit = 4194304 where id = 'media';

-- ---------- destinations: curated per-language content ----------
alter table public.destinations add column if not exists i18n jsonb not null default '{}'::jsonb;
create trigger trg_destinations_touch before update on public.destinations for each row execute function public.touch_updated_at();

-- ---------- AI assistant history ----------
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '' check (length(title) <= 120),
  lang text not null default 'en' check (lang in ('en', 'ru', 'ky')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user on public.ai_conversations (user_id, updated_at desc);
create table if not exists public.ai_messages (
  id bigserial primary key,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conv on public.ai_messages (conversation_id, id);
create trigger trg_ai_conversations_touch before update on public.ai_conversations for each row execute function public.touch_updated_at();
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
create policy ai_conv_owner on public.ai_conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_msg_owner on public.ai_messages for all using (
  exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
) with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- ---------- platform settings (single row) ----------
create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  maintenance_banner jsonb,
  inquiries_enabled boolean not null default true,
  ai_enabled boolean not null default true,
  partner_applications_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true) on conflict do nothing;
alter table public.platform_settings enable row level security;
create policy settings_read on public.platform_settings for select using (true);
create policy settings_admin on public.platform_settings for update using (public.is_admin()) with check (public.is_admin());

-- Inquiries can be switched off platform-wide.
drop policy if exists bookings_insert_traveler on public.bookings;
create policy bookings_insert_traveler on public.bookings for insert with check (
  traveler_id = auth.uid() and status = 'pending'
  and (select inquiries_enabled from public.platform_settings where id)
  and exists (select 1 from public.listings l where l.id = listing_id and l.partner_id = bookings.partner_id and l.status = 'approved'));
