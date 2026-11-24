-- Film clubs: "Now watching". The same as reading together, but for a film the parts are minutes:
-- you say how far you've watched (or tap Sync when you press play), and notes appear at the minute they're
-- about, never past where you are. Finishing the film puts it on the club's shelf as a film.
-- Run this in the Supabase SQL editor after 20261205000000_daily_note.sql. It is safe to run again.

alter table public.club_readings add column if not exists kind text not null default 'book';
alter table public.club_readings drop constraint if exists club_readings_kind_check;
alter table public.club_readings add constraint club_readings_kind_check check (kind in ('book', 'film'));
alter table public.club_readings drop constraint if exists club_readings_part_word_check;
alter table public.club_readings add constraint club_readings_part_word_check
  check (part_word in ('chapter', 'part', 'section', 'episode', 'minute'));
-- Films run up to 4 hours (minutes); books up to 200 chapters.
alter table public.club_readings drop constraint if exists club_readings_parts_check;
alter table public.club_readings add constraint club_readings_parts_check check (parts between 1 and 300);
alter table public.club_progress drop constraint if exists club_progress_part_check;
alter table public.club_progress add constraint club_progress_part_check check (part between 0 and 300);
alter table public.club_notes drop constraint if exists club_notes_part_check;
alter table public.club_notes add constraint club_notes_part_check check (part between 1 and 300);

grant insert (club_id, title, subtitle, cover_url, link, parts, part_word, due_on, started_by, kind) on public.club_readings to authenticated;

drop function if exists public.club_reading_now(uuid);
create function public.club_reading_now(p_club uuid)
returns table (id uuid, kind text, title text, subtitle text, cover_url text, link text, parts int, part_word text, due_on date,
               started_at timestamptz, my_part int, readers int, finished int, notes_ahead int)
language sql stable security definer set search_path = public as $$
  select r.id, r.kind, r.title, r.subtitle, r.cover_url, r.link, r.parts, r.part_word, r.due_on, r.started_at,
         public.my_reading_part(r.id),
         (select count(*)::int from public.club_progress p where p.reading_id = r.id and p.part > 0),
         (select count(*)::int from public.club_progress p where p.reading_id = r.id and p.part >= r.parts),
         (select count(*)::int from public.club_notes n where n.reading_id = r.id and n.author <> auth.uid()
            and n.part > public.my_reading_part(r.id) and not public.is_blocked(n.author, auth.uid()))
  from public.club_readings r
  where r.club_id = p_club and r.finished_at is null and public.is_club_member(p_club, auth.uid());
$$;
revoke execute on function public.club_reading_now(uuid) from public, anon;
grant execute on function public.club_reading_now(uuid) to authenticated;

create or replace function public.finish_club_reading(p_reading uuid, p_shelve boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.club_readings;
begin
  select * into r from public.club_readings where id = p_reading;
  if r.id is null or not public.is_club_host(r.club_id, auth.uid()) then raise exception 'Only the club''s hosts can do that.'; end if;
  if r.finished_at is not null then return; end if;
  update public.club_readings set finished_at = now() where id = p_reading;
  if p_shelve then
    insert into public.club_shelf (club_id, type, title, subtitle, cover_url, link, added_by)
    values (r.club_id, case when r.kind = 'film' then 'film' else 'book' end,
            left(r.title, 120), left(r.subtitle, 120), r.cover_url, r.link, auth.uid());
  end if;
end $$;
revoke execute on function public.finish_club_reading(uuid, boolean) from public, anon;
grant execute on function public.finish_club_reading(uuid, boolean) to authenticated;
