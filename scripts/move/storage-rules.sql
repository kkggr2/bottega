-- The rules for uploaded pictures and sound clips (bucket "media"), as in the migrations.
-- Run after the copy, in case the copy didn't bring them. Safe to run again.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
              'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/wav'])
on conflict (id) do nothing;

drop policy if exists "media read when room is" on storage.objects;
create policy "media read when room is" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.can_view_room(((storage.foldername(name))[1])::uuid));
drop policy if exists "media readable in public rooms" on storage.objects;
create policy "media readable in public rooms" on storage.objects
  for select to anon
  using (bucket_id = 'media' and public.can_view_room(((storage.foldername(name))[1])::uuid));
drop policy if exists "media owner upload" on storage.objects;
create policy "media owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "media owner delete" on storage.objects;
create policy "media owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
