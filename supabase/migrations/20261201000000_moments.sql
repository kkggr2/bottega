-- Moments: a line you wrote in Margins, pinned in your room like a ticket stub (show, episode, the minute).
-- Only your own comment, never anyone else's. Visitors see the show and the minute first; the words stay
-- folded until they tap, so nobody gets spoiled.
-- Run this in the Supabase SQL editor after 20261130000000_margins.sql. It is safe to run again.

alter table public.pieces drop constraint if exists pieces_type_check;
alter table public.pieces add constraint pieces_type_check
  check (type in ('poster', 'scene', 'poem', 'game', 'song', 'book', 'moment'));

-- Pin one of your own Margins comments to your room. Returns the new piece (or the one already pinned).
create or replace function margins.pin_moment(p_comment uuid)
returns uuid
language plpgsql security definer set search_path = public, margins as $$
declare
  c   margins.comments;
  s   margins.shows;
  lnk text;
  sub text;
  pid uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into c from margins.comments where id = p_comment and user_id = auth.uid() and not hidden;
  if not found then
    raise exception 'You can only pin your own comments.';
  end if;
  if not exists (select 1 from public.rooms where owner_id = auth.uid()) then
    raise exception 'Make your room first.';
  end if;

  select * into s from margins.shows where id = c.show_id;
  lnk := format('https://bottegarooms.com/watch/%s/%s/%s', c.show_id, c.season, c.episode);
  sub := format('S%s E%s · %s:%s', c.season, c.episode, c.t_seconds / 60, lpad((c.t_seconds % 60)::text, 2, '0'));

  -- Already pinned: hand back the same stub.
  select id into pid from public.pieces
  where owner_id = auth.uid() and type = 'moment' and link = lnk and subtitle = sub and body = c.body
  limit 1;
  if pid is not null then
    return pid;
  end if;

  insert into public.pieces (owner_id, type, title, subtitle, body, link, cover_url)
  values (auth.uid(), 'moment', left(coalesce(s.name, 'A TV series'), 80), sub, c.body, lnk,
          case when s.poster_path is not null then 'https://image.tmdb.org/t/p/w342' || s.poster_path end)
  returning id into pid;
  return pid;
end $$;

revoke execute on function margins.pin_moment(uuid) from public, anon;
grant execute on function margins.pin_moment(uuid) to authenticated;
