-- Media bucket: public read, writes only into partners/<partner_id>/... for members of that partner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy media_public_read on storage.objects for select using (bucket_id = 'media');
create policy media_member_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'media' and (storage.foldername(name))[1] = 'partners'
  and ((storage.foldername(name))[2] in (select public.my_partner_ids()) or public.is_admin()));
create policy media_member_delete on storage.objects for delete to authenticated using (
  bucket_id = 'media' and (storage.foldername(name))[1] = 'partners'
  and ((storage.foldername(name))[2] in (select public.my_partner_ids()) or public.is_admin()));
