-- Bottega: the daily quiz reminder. Folded into the one daily nudge (16:00 UTC): people who used Bottega in the
-- last two weeks, have a phone to tell, and haven't played today's quiz. Never more than one notification a day:
-- the server skips anyone who already got the "your turntable is free" line.
-- Run this in the Supabase SQL editor. It is safe to run again.

create or replace function public.quiz_nudge_targets(p_day date)
returns table (user_id uuid, token text, platform text)
language sql stable security definer set search_path = public as $$
  select t.user_id, t.token, t.platform
  from public.push_tokens t
  where exists (select 1 from public.events e where e.user_id = t.user_id and e.at > now() - interval '14 days')
    and not exists (select 1 from public.quiz_attempts a where a.user_id = t.user_id and a.day = p_day);
$$;
revoke execute on function public.quiz_nudge_targets(date) from public, anon, authenticated;
grant execute on function public.quiz_nudge_targets(date) to service_role;
