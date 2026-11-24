-- Clubs that grow: people whose rooms share a club's taste can find it.
--   * Off by default. A host turns it on and says where the club meets (a town, or online) and, if they like, when.
--   * Taste is concrete: the films, books and records on the club's shelf against what's in a person's room
--     (the same title, or the same director, author or artist). The reason is always shown.
--   * In-person clubs are only suggested to people who've said they're in that town. Online clubs to anyone.
--   * A person sees one quiet suggestion at a time (never a feed) and can say "Not for me".
--   * A host sees how many people match, never who. Private rooms are never matched.
-- Run this in the Supabase SQL editor after 20261208000000_film_night.sql. It is safe to run again.

alter table public.clubs add column if not exists discoverable boolean not null default false;
alter table public.clubs add column if not exists meets_in text not null default '' check (char_length(meets_in) <= 60);
alter table public.clubs add column if not exists meets_online boolean not null default false;
alter table public.clubs add column if not exists meets_when text not null default '' check (char_length(meets_when) <= 60);

-- Where a person is, if they choose to say (only to hear about clubs nearby). Its own table, readable by nobody:
-- only the functions below use it, and they never show it to anyone else.
create table if not exists public.user_towns (
  user_id  uuid primary key references public.profiles (id) on delete cascade,
  town     text not null default '' check (char_length(town) <= 60),
  updated_at timestamptz not null default now()
);
alter table public.user_towns enable row level security;
revoke all on public.user_towns from anon, authenticated;

create table if not exists public.club_not_for_me (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  club_id  uuid not null references public.clubs (id) on delete cascade,
  at       timestamptz not null default now(),
  primary key (user_id, club_id)
);
alter table public.club_not_for_me enable row level security;
revoke all on public.club_not_for_me from anon, authenticated;

-- Town names are compared loosely: case, spaces and a trailing ", UK" don't matter.
create or replace function public.town_key(p text) returns text
language sql immutable as $$
  select regexp_replace(lower(btrim(coalesce(p, ''))), '\s*,.*$|\s+', '', 'g');
$$;

-- "Director · 2024" → "director"; "2024" → '' (a bare year is not a creator).
create or replace function public.creator_key(p text) returns text
language sql immutable as $$
  select case when split_part(coalesce(p, ''), ' · ', 1) ~ '^\s*\d{4}\s*$' then ''
              else lower(btrim(split_part(coalesce(p, ''), ' · ', 1))) end;
$$;

create or replace function public.title_key(p text) returns text
language sql immutable as $$
  select regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '', 'g');
$$;

-- What each person and each club has, in one shape: kind (film/book/song), title key, creator key, title.
create or replace function public.club_taste(p_club uuid)
returns table (kind text, tkey text, ckey text, title text)
language sql stable security definer set search_path = public as $$
  select s.type, public.title_key(s.title), public.creator_key(s.subtitle), s.title
  from public.club_shelf s where s.club_id = p_club;
$$;

create or replace function public.room_taste(p_user uuid)
returns table (kind text, tkey text, ckey text, title text)
language sql stable security definer set search_path = public as $$
  select case p.type when 'poster' then 'film' when 'scene' then 'film' else p.type end,
         public.title_key(p.title), public.creator_key(p.subtitle), p.title
  from public.pieces p
  join public.rooms r on r.owner_id = p.owner_id and r.visibility <> 'private'
  where p.owner_id = p_user and p.type in ('poster', 'scene', 'book', 'song');
$$;
revoke execute on function public.club_taste(uuid), public.room_taste(uuid) from public, anon, authenticated;

-- How well one person matches one club: shared titles count most, then shared directors/authors/artists.
create or replace function public.taste_match(p_user uuid, p_club uuid)
returns table (score int, shared text[])
language sql stable security definer set search_path = public as $$
  with c as (select * from public.club_taste(p_club)),
       r as (select * from public.room_taste(p_user)),
       titles as (select distinct c.title from c join r on r.kind = c.kind and r.tkey = c.tkey and c.tkey <> ''),
       makers as (select distinct c.ckey from c join r on r.kind = c.kind and r.ckey = c.ckey and c.ckey <> '')
  select (select count(*)::int * 3 from titles) + (select count(*)::int from makers),
         array(select t.title from titles t order by t.title limit 3);
$$;
revoke execute on function public.taste_match(uuid, uuid) from public, anon, authenticated;

-- Clubs this person could be offered (open to finding, the right place, not theirs, not turned down, not banned).
create or replace function public.discoverable_for(p_user uuid)
returns setof public.clubs
language sql stable security definer set search_path = public as $$
  select c.* from public.clubs c
  where c.discoverable
    and (c.meets_online or (public.town_key(c.meets_in) <> ''
         and public.town_key(c.meets_in) = (select public.town_key(ut.town) from public.user_towns ut where ut.user_id = p_user)))
    and not exists (select 1 from public.club_members m where m.club_id = c.id and m.user_id = p_user)
    and not exists (select 1 from public.club_not_for_me x where x.club_id = c.id and x.user_id = p_user)
    and not exists (select 1 from public.club_bans b where b.club_id = c.id and b.user_id = p_user)
    and not public.is_blocked(c.host, p_user);
$$;
revoke execute on function public.discoverable_for(uuid) from public, anon, authenticated;

-- For the Salon: the one club that shares your taste most, with the reason. Nothing if there isn't a real match.
create or replace function public.club_suggestion()
returns table (club_id uuid, slug text, name text, emoji text, meets_in text, meets_online boolean, meets_when text,
               members int, shared text[])
language sql stable security definer set search_path = public as $$
  select c.id, c.slug::text, c.name, c.emoji, c.meets_in, c.meets_online, c.meets_when,
         (select count(*)::int from public.club_members m where m.club_id = c.id), tm.shared
  from public.discoverable_for(auth.uid()) c
  cross join lateral public.taste_match(auth.uid(), c.id) tm
  where auth.uid() is not null and tm.score >= 3   -- at least one shared title, or three shared makers
  order by tm.score desc, c.created_at desc
  limit 1;
$$;
revoke execute on function public.club_suggestion() from public, anon;
grant execute on function public.club_suggestion() to authenticated;

create or replace function public.not_for_me(p_club uuid)
returns void
language sql security definer set search_path = public as $$
  insert into public.club_not_for_me (user_id, club_id) values (auth.uid(), p_club) on conflict do nothing;
$$;
revoke execute on function public.not_for_me(uuid) from public, anon;
grant execute on function public.not_for_me(uuid) to authenticated;

-- For the host: the club's settings, and how many people would see it (a number, never names).
create or replace function public.club_discovery(p_club uuid)
returns table (discoverable boolean, meets_in text, meets_online boolean, meets_when text, reach int)
language sql stable security definer set search_path = public as $$
  select c.discoverable, c.meets_in, c.meets_online, c.meets_when,
         (select count(*)::int from public.profiles pr
           where pr.id <> c.host
             and not exists (select 1 from public.club_members m where m.club_id = c.id and m.user_id = pr.id)
             and (c.meets_online or (public.town_key(c.meets_in) <> '' and exists (select 1 from public.user_towns ut
                    where ut.user_id = pr.id and public.town_key(ut.town) = public.town_key(c.meets_in))))
             and (select tm.score from public.taste_match(pr.id, c.id) tm) >= 3)
  from public.clubs c
  where c.id = p_club and public.is_club_host(p_club, auth.uid());
$$;
revoke execute on function public.club_discovery(uuid) from public, anon;
grant execute on function public.club_discovery(uuid) to authenticated;

create or replace function public.set_club_discovery(p_club uuid, p_on boolean, p_in text, p_online boolean, p_when text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_club_host(p_club, auth.uid()) then raise exception 'Only the club''s hosts can do that.'; end if;
  if p_on and not p_online and btrim(coalesce(p_in, '')) = '' then raise exception 'Say which town you meet in, or choose online.'; end if;
  update public.clubs set discoverable = p_on, meets_in = left(btrim(coalesce(p_in, '')), 60),
         meets_online = coalesce(p_online, false), meets_when = left(btrim(coalesce(p_when, '')), 60)
   where id = p_club;
end $$;
revoke execute on function public.set_club_discovery(uuid, boolean, text, boolean, text) from public, anon;
grant execute on function public.set_club_discovery(uuid, boolean, text, boolean, text) to authenticated;

-- A person's own town (read and set only by them).
create or replace function public.my_town() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select town from public.user_towns where user_id = auth.uid()), '');
$$;
create or replace function public.set_my_town(p_town text) returns void
language sql security definer set search_path = public as $$
  insert into public.user_towns (user_id, town, updated_at) values (auth.uid(), left(btrim(coalesce(p_town, '')), 60), now())
  on conflict (user_id) do update set town = excluded.town, updated_at = now();
$$;
revoke execute on function public.my_town(), public.set_my_town(text) from public, anon;
grant execute on function public.my_town(), public.set_my_town(text) to authenticated;

