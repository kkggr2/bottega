-- A cover for every book on a club's shelf. Hosts can pick a cover found online, or add a photo of their own copy
-- (for small-press books no catalogue has). Photos live in a public "club-covers" folder per club, because the shelf
-- shows on the club's invitation page too; only the club's hosts can add or remove them. Setting a cover changes it
-- everywhere the club shows that title (the shelf and "Now reading").
-- Run this in the Supabase SQL editor after 20261211000000_longer_messages.sql. It is safe to run again.

-- ---------------------------------------------------------------------------
-- 1. Where cover photos live: club-covers/<club id>/<photo>.jpg
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-covers', 'club-covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Is the signed-in person a host of the club this file's folder belongs to?
create or replace function public.club_cover_host(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then public.is_club_host(((storage.foldername(p_name))[1])::uuid, auth.uid())
              else false end;
$$;
-- Is this file left over from a club that's been deleted? (So its photos can be tidied away afterwards.)
create or replace function public.club_cover_orphaned(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then not exists (select 1 from public.clubs where id = ((storage.foldername(p_name))[1])::uuid)
              else false end;
$$;
revoke execute on function public.club_cover_host(text) from public, anon;
revoke execute on function public.club_cover_orphaned(text) from public, anon;
grant execute on function public.club_cover_host(text) to authenticated;
grant execute on function public.club_cover_orphaned(text) to authenticated;

drop policy if exists "club covers listed" on storage.objects;
create policy "club covers listed" on storage.objects
  for select to authenticated using (bucket_id = 'club-covers');
drop policy if exists "club covers added by hosts" on storage.objects;
create policy "club covers added by hosts" on storage.objects
  for insert to authenticated with check (bucket_id = 'club-covers' and public.club_cover_host(name));
drop policy if exists "club covers removed by hosts" on storage.objects;
create policy "club covers removed by hosts" on storage.objects
  for delete to authenticated using (bucket_id = 'club-covers' and (public.club_cover_host(name) or public.club_cover_orphaned(name)));

-- ---------------------------------------------------------------------------
-- 2. Covers can come from the catalogues as before, or from the club's own cover folder
-- ---------------------------------------------------------------------------

create or replace function public.club_cover_ok(p_url text) returns boolean
language sql immutable as $$
  select p_url is null
      or p_url ~ '^https://(is[0-9]+-ssl\.mzstatic\.com|covers\.openlibrary\.org|i\.ytimg\.com|image\.tmdb\.org)/'
      or p_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/club-covers/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$';
$$;

do $$
declare c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where conrelid in ('public.club_shelf'::regclass, 'public.club_readings'::regclass)
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%cover_url%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table public.club_shelf add constraint club_shelf_cover_url_check check (public.club_cover_ok(cover_url));
alter table public.club_readings add constraint club_readings_cover_url_check check (public.club_cover_ok(cover_url));

-- ---------------------------------------------------------------------------
-- 3. A host sets a title's cover, everywhere the club shows it. Returns how many places changed.
-- ---------------------------------------------------------------------------

create or replace function public.set_club_cover(p_club uuid, p_title text, p_cover text)
returns int
language plpgsql security definer set search_path = public as $$
declare shelf int := 0; reading int := 0;
begin
  if not public.is_club_host(p_club, auth.uid()) then raise exception 'Only the club''s hosts can do that.'; end if;
  if p_cover is null or not public.club_cover_ok(p_cover) then raise exception 'That picture can''t be used as a cover.'; end if;
  update public.club_shelf set cover_url = p_cover
   where club_id = p_club and lower(btrim(title)) = lower(btrim(p_title));
  get diagnostics shelf = row_count;
  update public.club_readings set cover_url = p_cover
   where club_id = p_club and lower(btrim(title)) = lower(btrim(p_title));
  get diagnostics reading = row_count;
  return shelf + reading;
end $$;
revoke execute on function public.set_club_cover(uuid, text, text) from public, anon;
grant execute on function public.set_club_cover(uuid, text, text) to authenticated;
