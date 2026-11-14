-- Bottega: the daily ritual and the daily quiz.
-- Run this in the Supabase SQL editor. It is safe to run again.

-- ---------------------------------------------------------------------------
-- Once a day: the record on the turntable, the film in the TV and the book on the armchair
-- can each be changed once every 24 hours. For 10 minutes after putting something on you can
-- still change your mind (the 24 hours count from the first pick). Taking something off is
-- always allowed, but doesn't restart the clock.
-- ---------------------------------------------------------------------------

create or replace function public.check_now_playing() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  undo interval := interval '10 minutes';
  day  interval := interval '24 hours';
begin
  if new.now_song is distinct from old.now_song then
    if new.now_song is not null and not exists (
      select 1 from public.pieces where id = new.now_song and owner_id = new.owner_id and type = 'song') then
      raise exception 'That record isn''t in this room.';
    end if;
    if new.now_song is null then
      new.now_song_at := old.now_song_at;
    elsif old.now_song_at is not null and now() - old.now_song_at < undo then
      new.now_song_at := old.now_song_at;
    elsif old.now_song_at is not null and now() - old.now_song_at < day then
      raise exception 'Once a day: you can change your record again in %.', public.wait_text(old.now_song_at + day);
    else
      new.now_song_at := now();
    end if;
  else
    new.now_song_at := old.now_song_at;
  end if;

  if new.now_film is distinct from old.now_film then
    if new.now_film is not null and not exists (
      select 1 from public.pieces where id = new.now_film and owner_id = new.owner_id and type in ('scene', 'poster')) then
      raise exception 'That film isn''t in this room.';
    end if;
    if new.now_film is null then
      new.now_film_at := old.now_film_at;
    elsif old.now_film_at is not null and now() - old.now_film_at < undo then
      new.now_film_at := old.now_film_at;
    elsif old.now_film_at is not null and now() - old.now_film_at < day then
      raise exception 'Once a day: you can change your film again in %.', public.wait_text(old.now_film_at + day);
    else
      new.now_film_at := now();
    end if;
  else
    new.now_film_at := old.now_film_at;
  end if;

  if new.now_book is distinct from old.now_book then
    if new.now_book is not null and not exists (
      select 1 from public.pieces where id = new.now_book and owner_id = new.owner_id and type = 'book') then
      raise exception 'That book isn''t in this room.';
    end if;
    if new.now_book is null then
      new.now_book_at := old.now_book_at;
    elsif old.now_book_at is not null and now() - old.now_book_at < undo then
      new.now_book_at := old.now_book_at;
    elsif old.now_book_at is not null and now() - old.now_book_at < day then
      raise exception 'Once a day: you can change your book again in %.', public.wait_text(old.now_book_at + day);
    else
      new.now_book_at := now();
    end if;
  else
    new.now_book_at := old.now_book_at;
  end if;

  return new;
end $$;

-- "5 hours" / "40 minutes", for the message above.
create or replace function public.wait_text(until timestamptz) returns text
language sql stable set search_path = public as $$
  select case
    when until - now() >= interval '1 hour'
      then ceil(extract(epoch from until - now()) / 3600)::int || ' hours'
    else greatest(1, ceil(extract(epoch from until - now()) / 60)::int) || ' minutes'
  end;
$$;

-- People whose turntable, TV or armchair opened up again in the last day, who used the ritual
-- in the last week and have a phone to tell. One nudge a day at most (the cron runs daily).
create or replace function public.ritual_targets()
returns table (user_id uuid, token text, platform text, slots text[])
language sql stable security definer set search_path = public as $$
  with open_slots as (
    select r.owner_id,
           array_remove(array[
             case when r.now_song_at between now() - interval '48 hours' and now() - interval '24 hours' then 'song' end,
             case when r.now_film_at between now() - interval '48 hours' and now() - interval '24 hours' then 'film' end,
             case when r.now_book_at between now() - interval '48 hours' and now() - interval '24 hours' then 'book' end
           ], null) as slots
    from public.rooms r
    where greatest(r.now_song_at, r.now_film_at, r.now_book_at) > now() - interval '7 days'
  )
  select o.owner_id, t.token, t.platform, o.slots
  from open_slots o
  join public.push_tokens t on t.user_id = o.owner_id
  where cardinality(o.slots) > 0;
$$;
revoke execute on function public.ritual_targets() from public, anon, authenticated;
grant execute on function public.ritual_targets() to service_role;

-- ---------------------------------------------------------------------------
-- The daily quiz: one niche theme, 7 timed questions, one try a day.
-- The questions and answers live on the server (src/lib/quiz), never in this table or the app;
-- the server marks each answer and times it, so scores can't be made up.
-- ---------------------------------------------------------------------------

create table if not exists public.quiz_attempts (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  day          date not null,
  quiz_id      text not null,
  q_index      int  not null default 0,
  q_started_at timestamptz not null default now(),
  correct      int  not null default 0,
  score        int  not null default 0,
  time_ms      int  not null default 0,
  answers      jsonb not null default '[]',
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  primary key (user_id, day)
);
create index if not exists quiz_attempts_board on public.quiz_attempts (day, score desc, time_ms);
alter table public.quiz_attempts enable row level security;
drop policy if exists "own quiz attempts" on public.quiz_attempts;
create policy "own quiz attempts" on public.quiz_attempts
  for select to authenticated using (user_id = auth.uid());
revoke all on public.quiz_attempts from anon, authenticated;
grant select on public.quiz_attempts to authenticated;
grant select, insert, update, delete on public.quiz_attempts to service_role;

-- The day's high score table: finished tries only, best score first, then the fastest.
create or replace function public.quiz_board(p_day date, p_limit int default 20)
returns table (rank bigint, user_id uuid, username text, score int, correct int, time_ms int)
language sql stable security definer set search_path = public as $$
  select rank() over (order by a.score desc, a.time_ms asc), a.user_id, p.username::text, a.score, a.correct, a.time_ms
  from public.quiz_attempts a
  join public.profiles p on p.id = a.user_id
  where a.day = p_day and a.finished_at is not null
  order by a.score desc, a.time_ms asc
  limit p_limit;
$$;
revoke execute on function public.quiz_board(date, int) from public, anon, authenticated;
grant execute on function public.quiz_board(date, int) to service_role;

-- Growth events for the new things.
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'open', 'landing', 'example', 'room_view', 'make_yours',
  'account_created', 'room_claimed', 'piece_added', 'import',
  'share_link', 'share_picture', 'friend_request', 'made_public', 'now_set',
  'quiz_start', 'quiz_done'));
