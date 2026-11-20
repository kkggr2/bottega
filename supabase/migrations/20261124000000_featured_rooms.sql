-- Curated rooms: rooms by bookshops, cinemas, clubs, critics and artists that anyone can visit,
-- shown in the library ("Rooms to visit") and on the welcome page.
-- Only Bottega adds them (here in the SQL editor, see docs/CURATED_ROOMS.md); a featured room has to be public.
-- Run this in the Supabase SQL editor. It is safe to run again.

create table if not exists public.featured_rooms (
  owner_id   uuid primary key references public.profiles (id) on delete cascade,
  label      text not null check (char_length(label) between 2 and 40),   -- "Bookshop · London"
  blurb      text not null default '' check (char_length(blurb) <= 140),  -- one line about them
  position   int  not null default 100,                                    -- lower comes first
  added_at   timestamptz not null default now()
);
alter table public.featured_rooms enable row level security;
revoke all on public.featured_rooms from anon, authenticated;
grant all on public.featured_rooms to service_role;

-- What the app shows: only featured rooms that are public, with three covers each.
create or replace function public.featured_rooms()
returns table (username text, room_name text, theme text, label text, blurb text, covers text[])
language sql stable security definer set search_path = public as $$
  select p.username::text, r.name, r.theme, f.label, f.blurb,
         array(select x.cover_url from public.pieces x
               where x.owner_id = f.owner_id and x.cover_url is not null
               order by x.position limit 3)
  from public.featured_rooms f
  join public.rooms r on r.owner_id = f.owner_id and r.visibility = 'public'
  join public.profiles p on p.id = f.owner_id
  order by f.position, f.added_at;
$$;
grant execute on function public.featured_rooms() to anon, authenticated;

-- Whether a room is featured, and its label, for the badge on the room itself.
create or replace function public.featured_label(p_username text)
returns text
language sql stable security definer set search_path = public as $$
  select f.label from public.featured_rooms f
  join public.profiles p on p.id = f.owner_id
  join public.rooms r on r.owner_id = f.owner_id and r.visibility = 'public'
  where p.username = lower(btrim(p_username));
$$;
grant execute on function public.featured_label(text) to anon, authenticated;
