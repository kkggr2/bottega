-- Bottega: club quizzes. Each club can have its own quizzes (written into the app's code, like the daily
-- ones), with one try per member and a high score table only that club sees. The server marks and times
-- every answer, as with the daily quiz. Run this in the Supabase SQL editor after 20261116000000_clubs.sql.
-- It is safe to run again.

create table if not exists public.club_quiz_attempts (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  club_id      uuid not null references public.clubs (id) on delete cascade,
  quiz_id      text not null check (char_length(quiz_id) between 3 and 80),
  q_index      int  not null default 0,
  q_started_at timestamptz not null default now(),
  correct      int  not null default 0,
  score        int  not null default 0,
  time_ms      int  not null default 0,
  answers      jsonb not null default '[]',
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  primary key (user_id, quiz_id)
);
create index if not exists club_quiz_attempts_board on public.club_quiz_attempts (quiz_id, score desc, time_ms);
alter table public.club_quiz_attempts enable row level security;
drop policy if exists "own club quiz attempts" on public.club_quiz_attempts;
create policy "own club quiz attempts" on public.club_quiz_attempts
  for select to authenticated using (user_id = auth.uid());
revoke all on public.club_quiz_attempts from anon, authenticated;
grant select on public.club_quiz_attempts to authenticated;
grant select, insert, update, delete on public.club_quiz_attempts to service_role;

-- A club quiz's high score table: finished tries by people still in the club, best first, then fastest.
create or replace function public.club_quiz_board(p_quiz text, p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, score int, correct int, time_ms int)
language sql stable security definer set search_path = public as $$
  select rank() over (order by a.score desc, a.time_ms asc), a.user_id, p.username::text, a.score, a.correct, a.time_ms
  from public.club_quiz_attempts a
  join public.profiles p on p.id = a.user_id
  join public.club_members m on m.club_id = a.club_id and m.user_id = a.user_id
  where a.quiz_id = p_quiz and a.finished_at is not null
  order by a.score desc, a.time_ms asc
  limit p_limit;
$$;
revoke execute on function public.club_quiz_board(text, int) from public, anon, authenticated;
grant execute on function public.club_quiz_board(text, int) to service_role;
