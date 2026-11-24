-- One notification a day, and only when there's something real: the best thing for each person, in order.
--   1. new notes in your club's book that you can read now (in chapters you've reached)
--   2. a club vote you haven't voted in
--   3. someone asking to swap keys with you
--   4. people who stepped into your room
-- (Meeting reminders, "your turntable is free" and the daily quiz are picked in the daily job around these.)
-- Muted clubs stay quiet. Only people with notifications on are listed. Service role only.
-- Run this in the Supabase SQL editor after 20261204000000_club_life_fix.sql. It is safe to run again.

create or replace function public.daily_note_candidates()
returns table (user_id uuid, kind text, n int, label text, slug text)
language sql stable security definer set search_path = public as $$
  with people as (select distinct t.user_id from public.push_tokens t),

  -- 1. Notes others wrote in the last day, in chapters you've already reached, in clubs you haven't muted.
  notes as (
    select m.user_id, 'club_notes'::text as kind, count(*)::int as n, r.title as label, c.slug, 1 as rank
    from public.club_members m
    join people p on p.user_id = m.user_id
    join public.clubs c on c.id = m.club_id
    join public.club_readings r on r.club_id = c.id and r.finished_at is null
    join public.club_progress g on g.reading_id = r.id and g.user_id = m.user_id
    join public.club_notes n on n.reading_id = r.id
    where not m.muted and n.author <> m.user_id and n.part <= g.part
      and n.created_at > now() - interval '24 hours'
      and not public.is_blocked(n.author, m.user_id)
    group by m.user_id, r.title, c.slug
  ),

  -- 2. An open vote from the last three days you haven't answered.
  votes as (
    select m.user_id, 'club_vote'::text, 1, c.name, c.slug, 2
    from public.club_members m
    join people p on p.user_id = m.user_id
    join public.clubs c on c.id = m.club_id
    join public.club_polls q on q.club_id = c.id and q.closed_at is null and q.created_at > now() - interval '3 days'
    where not m.muted
      and not exists (select 1 from public.club_votes v where v.poll_id = q.id and v.user_id = m.user_id)
  ),

  -- 3. Someone asked to swap keys in the last three days and you haven't answered.
  requests as (
    select f.addressee, 'request'::text, count(*)::int, min(pr.username)::text, null::text, 3
    from public.friendships f
    join people p on p.user_id = f.addressee
    join public.profiles pr on pr.id = f.requester
    where f.status = 'pending' and f.created_at > now() - interval '3 days'
      and not public.is_blocked(f.requester, f.addressee)
    group by f.addressee
  ),

  -- 4. People (other than you) who stepped into your room in the last day.
  visits as (
    select e.room_owner, 'visits'::text, count(distinct e.visitor)::int, null::text, null::text, 4
    from public.events e
    join people p on p.user_id = e.room_owner
    where e.name = 'room_view' and e.at > now() - interval '24 hours'
      and e.user_id is distinct from e.room_owner
    group by e.room_owner
  ),

  everything as (
    select * from notes
    union all select * from votes
    union all select * from requests
    union all select * from visits
  )
  select distinct on (x.user_id) x.user_id, x.kind, x.n, x.label, x.slug
  from everything x
  order by x.user_id, x.rank, x.n desc;
$$;
revoke execute on function public.daily_note_candidates() from public, anon, authenticated;
grant execute on function public.daily_note_candidates() to service_role;
