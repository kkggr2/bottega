-- Margins moves into Bottega: watching TV "together", with comments that appear at the second they were written.
-- One account (Bottega's profiles), one friend graph (friendships), one block list (public.blocks).
-- Margins' own tables live in their own schema, `margins`, so nothing clashes with Bottega's.
-- Run this in the Supabase SQL editor. It is safe to run again.
--
-- After running it: Project Settings → Data API → Exposed schemas → add `margins` (keep `public`).
-- The app then reads and writes Margins tables with the header "Accept-Profile: margins" (reads)
-- or "Content-Profile: margins" (writes and functions).

create schema if not exists margins;
grant usage on schema margins to authenticated, service_role;
revoke all on schema margins from anon;

-- ---------------------------------------------------------------------------
-- Settings on the shared profile
-- ---------------------------------------------------------------------------

-- Whether this person's viewing counts toward anonymous studio insights (one opt-out for everything).
alter table public.profiles add column if not exists share_in_insights boolean not null default true;
-- Whether friends see "Watching … S1 E3" on the TV in your room while you watch in Margins.
alter table public.profiles add column if not exists show_watching boolean not null default true;

drop policy if exists "update own settings" on public.profiles;
create policy "update own settings" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant update (share_in_insights, show_watching) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Show names and posters, saved by the server when someone opens a show, so rooms can label
-- what someone is watching without asking TMDB.
create table if not exists margins.shows (
  id           integer primary key,            -- TMDB TV id
  name         text not null check (char_length(name) between 1 and 200),
  poster_path  text check (poster_path is null or poster_path ~ '^/[A-Za-z0-9._-]+$'),
  updated_at   timestamptz not null default now()
);

create table if not exists margins.comments (
  id            uuid primary key default gen_random_uuid(),
  show_id       integer not null,              -- TMDB TV id
  season        integer not null check (season >= 0),
  episode       integer not null check (episode >= 1),
  t_seconds     integer not null check (t_seconds between 0 and 36000),
  body          text not null check (char_length(body) between 1 and 280),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  like_count    integer not null default 0,
  report_count  integer not null default 0,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists comments_episode_time on margins.comments (show_id, season, episode, t_seconds);
create index if not exists comments_episode_created on margins.comments (show_id, season, episode, created_at);
create index if not exists comments_user on margins.comments (user_id, created_at);

create table if not exists margins.likes (
  comment_id  uuid not null references margins.comments (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists margins.reports (
  comment_id  uuid not null references margins.comments (id) on delete cascade,
  reporter    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason      text not null default 'user_report' check (char_length(reason) <= 200),
  created_at  timestamptz not null default now(),
  primary key (comment_id, reporter)
);

create table if not exists margins.watch_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  show_id     integer not null,
  season      integer not null check (season >= 0),
  episode     integer not null check (episode >= 1),
  start_t     integer not null default 0 check (start_t between 0 and 36000),
  last_t      integer not null default 0 check (last_t between 0 and 36000),
  started_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists watch_sessions_episode on margins.watch_sessions (show_id, season, episode);
create index if not exists watch_sessions_user on margins.watch_sessions (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Keep like_count in sync.
create or replace function margins.bump_like_count() returns trigger
language plpgsql security definer set search_path = margins, public as $$
begin
  if tg_op = 'INSERT' then
    update margins.comments set like_count = like_count + 1 where id = new.comment_id;
  else
    update margins.comments set like_count = greatest(0, like_count - 1) where id = old.comment_id;
  end if;
  return null;
end $$;
drop trigger if exists likes_count on margins.likes;
create trigger likes_count after insert or delete on margins.likes
  for each row execute function margins.bump_like_count();

-- Hide a comment automatically once 3 different people report it. Review hidden comments in the dashboard.
create or replace function margins.handle_report() returns trigger
language plpgsql security definer set search_path = margins, public as $$
begin
  update margins.comments set report_count = report_count + 1,
                              hidden = hidden or report_count + 1 >= 3
  where id = new.comment_id;
  return null;
end $$;
drop trigger if exists reports_hide on margins.reports;
create trigger reports_hide after insert on margins.reports
  for each row execute function margins.handle_report();

-- Simple flood control: at most 10 comments per person per minute.
create or replace function margins.limit_comment_rate() returns trigger
language plpgsql security definer set search_path = margins, public as $$
begin
  if (select count(*) from margins.comments
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Slow down a little: too many comments in a minute.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists comments_rate on margins.comments;
create trigger comments_rate before insert on margins.comments
  for each row execute function margins.limit_comment_rate();

-- ---------------------------------------------------------------------------
-- What the app reads
-- ---------------------------------------------------------------------------

-- Visible comments with the author's name, minus people you blocked or who blocked you (Bottega's block list).
create or replace view margins.comment_feed with (security_invoker = on) as
select c.id, c.show_id, c.season, c.episode, c.t_seconds, c.body, c.user_id,
       p.username::text as username, c.like_count, c.created_at,
       exists (select 1 from margins.likes l where l.comment_id = c.id and l.user_id = auth.uid()) as liked_by_me
from margins.comments c
join public.profiles p on p.id = c.user_id
where not c.hidden
  and not public.is_blocked(auth.uid(), c.user_id);

-- Reaction counts per time bin for the whole episode. Counts only, never text, so nothing is spoiled.
create or replace function margins.episode_heat(p_show integer, p_season integer, p_episode integer, p_bin integer default 30)
returns table (bin integer, n integer)
language sql stable security invoker set search_path = margins, public as $$
  select (t_seconds / greatest(p_bin, 5))::integer as bin, count(*)::integer as n
  from margins.comments
  where show_id = p_show and season = p_season and episode = p_episode and not hidden
  group by 1 order by 1;
$$;

-- Insights for one episode, in time bins: how many viewers were still watching, and how much they reacted.
-- Returns nothing unless at least p_min_viewers people (who allow insights) watched the episode.
-- Only the server (service role) can call this. Bottega room data is never part of it.
create or replace function margins.episode_insights(p_show integer, p_season integer, p_episode integer,
                                                    p_bin integer default 60, p_min_viewers integer default 20)
returns table (bin_start_seconds integer, viewers_still_watching integer, reactions integer, people_reacting integer)
language sql stable security definer set search_path = margins, public as $$
  with viewers as (
    select s.user_id, max(s.last_t) as reached
    from margins.watch_sessions s join public.profiles p on p.id = s.user_id and p.share_in_insights
    where s.show_id = p_show and s.season = p_season and s.episode = p_episode
    group by s.user_id
  ),
  enough as (select count(*) >= greatest(p_min_viewers, 5) as ok from viewers),
  bins as (
    select generate_series(0, coalesce((select max(reached) from viewers), 0), greatest(p_bin, 10)) as b
  ),
  reacts as (
    select (c.t_seconds / greatest(p_bin, 10)) * greatest(p_bin, 10) as b,
           count(*)::integer as n, count(distinct c.user_id)::integer as u
    from margins.comments c join public.profiles p on p.id = c.user_id and p.share_in_insights
    where c.show_id = p_show and c.season = p_season and c.episode = p_episode and not c.hidden
    group by 1
  )
  select bins.b::integer,
         (select count(*) from viewers v where v.reached >= bins.b)::integer,
         coalesce(reacts.n, 0), coalesce(reacts.u, 0)
  from bins left join reacts on reacts.b = bins.b
  where (select ok from enough)
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Bottega ↔ Margins
-- ---------------------------------------------------------------------------

-- The people I'm friends with on Bottega (accepted, both directions), for highlighting friends' comments.
create or replace function public.my_friends()
returns table (user_id uuid, username text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text
  from public.friendships f
  join public.profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where f.status = 'accepted' and auth.uid() in (f.requester, f.addressee)
  order by p.username;
$$;
revoke execute on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;

-- What someone is watching in Margins right now, for the TV in their room. Only the show and the episode,
-- never a comment or a minute. Empty unless the visitor may see the room, the owner allows it, nobody has
-- blocked anybody, and the session moved in the last 2 hours.
create or replace function public.watching_now(p_username text)
returns table (show_id integer, show_name text, poster_path text, season integer, episode integer, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.show_id, sh.name, sh.poster_path, s.season, s.episode, s.updated_at
  from public.profiles p
  join margins.watch_sessions s on s.user_id = p.id
  left join margins.shows sh on sh.id = s.show_id
  where p.username = lower(btrim(p_username))
    and p.show_watching
    and public.can_view_room(p.id)
    and (auth.uid() is null or not public.is_blocked(auth.uid(), p.id))
    and s.updated_at > now() - interval '2 hours'
  order by s.updated_at desc
  limit 1;
$$;
revoke execute on function public.watching_now(text) from public;
grant execute on function public.watching_now(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table margins.shows enable row level security;
alter table margins.comments enable row level security;
alter table margins.likes enable row level security;
alter table margins.reports enable row level security;
alter table margins.watch_sessions enable row level security;

drop policy if exists "shows readable" on margins.shows;
create policy "shows readable" on margins.shows for select to authenticated using (true);

drop policy if exists "comments readable" on margins.comments;
create policy "comments readable" on margins.comments for select to authenticated using (not hidden or user_id = auth.uid());
drop policy if exists "post own comments" on margins.comments;
create policy "post own comments" on margins.comments for insert to authenticated
  with check (user_id = auth.uid() and like_count = 0 and report_count = 0 and hidden = false);
drop policy if exists "delete own comments" on margins.comments;
create policy "delete own comments" on margins.comments for delete to authenticated using (user_id = auth.uid());

drop policy if exists "see own likes" on margins.likes;
create policy "see own likes" on margins.likes for select to authenticated using (user_id = auth.uid());
drop policy if exists "like" on margins.likes;
create policy "like" on margins.likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "unlike" on margins.likes;
create policy "unlike" on margins.likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "report" on margins.reports;
create policy "report" on margins.reports for insert to authenticated with check (reporter = auth.uid());

drop policy if exists "see own sessions" on margins.watch_sessions;
create policy "see own sessions" on margins.watch_sessions for select to authenticated using (user_id = auth.uid());
drop policy if exists "start own sessions" on margins.watch_sessions;
create policy "start own sessions" on margins.watch_sessions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "update own sessions" on margins.watch_sessions;
create policy "update own sessions" on margins.watch_sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Signed-in people (guests included, as in Margins today) get only what the app needs; logged-out requests get nothing.
revoke all on all tables in schema margins from anon, authenticated;
grant select on margins.shows to authenticated;
grant select, insert, delete on margins.comments to authenticated;   -- no update: counters and hidden flags stay server-side
grant select, insert, delete on margins.likes to authenticated;
grant insert on margins.reports to authenticated;
grant select, insert on margins.watch_sessions to authenticated;
grant update (last_t, updated_at) on margins.watch_sessions to authenticated;
grant select on margins.comment_feed to authenticated;
grant all on all tables in schema margins to service_role;

revoke execute on all functions in schema margins from public, anon;
grant execute on function margins.episode_heat(integer, integer, integer, integer) to authenticated;
revoke execute on function margins.episode_insights(integer, integer, integer, integer, integer) from authenticated;
grant execute on function margins.episode_insights(integer, integer, integer, integer, integer) to service_role;
