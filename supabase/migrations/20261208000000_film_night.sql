-- Film night ratings: the paper slip, on a phone. A host opens rating for tonight's film (any film on the
-- club's shelf); one QR code for the whole season (bottegarooms.com/rate/<club>) opens "How was it? ★1–5"
-- with an optional line. The result shows at once, and the shelf becomes the season's table, ranked by members.
-- Run this in the Supabase SQL editor after 20261207000000_club_tools.sql. It is safe to run again.

alter table public.clubs add column if not exists rating_item uuid references public.club_shelf (id) on delete set null;
alter table public.clubs add column if not exists rating_opened_at timestamptz;

create table if not exists public.club_ratings (
  item_id     uuid not null references public.club_shelf (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  stars       int not null check (stars between 1 and 5),
  comment     text not null default '' check (char_length(comment) <= 280),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index if not exists club_ratings_item on public.club_ratings (item_id);
alter table public.club_ratings enable row level security;
-- Nobody reads or writes the table directly: everything goes through the functions below.
revoke all on public.club_ratings from anon, authenticated;
grant all on public.club_ratings to service_role;

-- Hosts open rating for a film on the shelf, or close it (p_item null).
create or replace function public.open_club_rating(p_club uuid, p_item uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_club_host(p_club, auth.uid()) then raise exception 'Only the club''s hosts can do that.'; end if;
  if p_item is not null and not exists (select 1 from public.club_shelf s where s.id = p_item and s.club_id = p_club) then
    raise exception 'That isn''t on the club''s shelf.';
  end if;
  update public.clubs set rating_item = p_item, rating_opened_at = case when p_item is null then null else now() end
   where id = p_club;
end $$;
revoke execute on function public.open_club_rating(uuid, uuid) from public, anon;
grant execute on function public.open_club_rating(uuid, uuid) to authenticated;

-- The rate page: what's open in this club right now. Anyone with the link sees the film (it's on the screen
-- in the room anyway); the score and your own rating need you to be in the club.
create or replace function public.club_rating_open(p_slug text)
returns table (club_id uuid, club_name text, emoji text, item_id uuid, title text, subtitle text, cover_url text,
               is_member boolean, ratings int, average numeric, my_stars int, my_comment text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.emoji, s.id, s.title, s.subtitle, s.cover_url,
         public.is_club_member(c.id, auth.uid()),
         case when public.is_club_member(c.id, auth.uid()) then (select count(*)::int from public.club_ratings r where r.item_id = s.id) end,
         case when public.is_club_member(c.id, auth.uid()) then (select round(avg(r.stars), 1) from public.club_ratings r where r.item_id = s.id) end,
         (select r.stars from public.club_ratings r where r.item_id = s.id and r.user_id = auth.uid()),
         (select r.comment from public.club_ratings r where r.item_id = s.id and r.user_id = auth.uid())
  from public.clubs c
  left join public.club_shelf s on s.id = c.rating_item
  where c.slug = lower(p_slug);
$$;
revoke execute on function public.club_rating_open(text) from public;
grant execute on function public.club_rating_open(text) to anon, authenticated;

-- Rate a film on the shelf (members; you can change your mind). Returns nothing; read the score afterwards.
create or replace function public.rate_club_film(p_item uuid, p_stars int, p_comment text default '')
returns void
language plpgsql security definer set search_path = public as $$
declare v_club uuid; v_comment text := left(btrim(coalesce(p_comment, '')), 280);
begin
  select club_id into v_club from public.club_shelf where id = p_item;
  if v_club is null then raise exception 'That film isn''t on the shelf any more.'; end if;
  if not public.is_club_member(v_club, auth.uid()) then raise exception 'Join the club to rate.'; end if;
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'Pick one to five stars.'; end if;
  if v_comment <> '' and public.is_offensive(v_comment) then raise exception 'Keep it kind: that line can''t go up.'; end if;
  insert into public.club_ratings (item_id, user_id, stars, comment)
  values (p_item, auth.uid(), p_stars, v_comment)
  on conflict (item_id, user_id) do update set stars = excluded.stars, comment = excluded.comment, updated_at = now();
end $$;
revoke execute on function public.rate_club_film(uuid, int, text) from public, anon;
grant execute on function public.rate_club_film(uuid, int, text) to authenticated;

-- What members said about a film (newest first), for members.
create or replace function public.club_rating_lines(p_item uuid)
returns table (username text, stars int, comment text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.username::text, r.stars, r.comment, r.updated_at
  from public.club_ratings r
  join public.club_shelf s on s.id = r.item_id
  join public.profiles p on p.id = r.user_id
  where r.item_id = p_item and r.comment <> ''
    and public.is_club_member(s.club_id, auth.uid())
    and not public.is_blocked(r.user_id, auth.uid())
  order by r.updated_at desc
  limit 40;
$$;
revoke execute on function public.club_rating_lines(uuid) from public, anon;
grant execute on function public.club_rating_lines(uuid) to authenticated;

-- The season's table: every film on the shelf that members have rated, best first. Members only.
create or replace function public.club_scores(p_club uuid)
returns table (item_id uuid, title text, subtitle text, cover_url text, average numeric, ratings int, my_stars int)
language sql stable security definer set search_path = public as $$
  select s.id, s.title, s.subtitle, s.cover_url, round(avg(r.stars), 1), count(*)::int,
         max(case when r.user_id = auth.uid() then r.stars end)
  from public.club_shelf s
  join public.club_ratings r on r.item_id = s.id
  where s.club_id = p_club and public.is_club_member(p_club, auth.uid())
  group by s.id
  order by avg(r.stars) desc, count(*) desc, s.title;
$$;
revoke execute on function public.club_scores(uuid) from public, anon;
grant execute on function public.club_scores(uuid) to authenticated;
