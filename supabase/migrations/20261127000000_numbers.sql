-- The numbers page (bottegarooms.com/numbers): sign-ups, first-day rooms, friends and who came back,
-- per invite source (?via=katrina). Only people in public.admins can read it.
-- Also fixes the event list: club events were being refused since clubs launched.
-- Run this in the Supabase SQL editor. It is safe to run again.

-- Every event the app sends, including the club ones and invite-link visits.
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'open', 'landing', 'example', 'room_view', 'make_yours',
  'account_created', 'room_claimed', 'piece_added', 'import',
  'share_link', 'share_picture', 'friend_request', 'made_public', 'now_set',
  'quiz_start', 'quiz_done', 'chat_open', 'chat_send', 'dm_send',
  'club_view', 'club_join', 'club_create', 'visit'));
create index if not exists events_visit on public.events (at) where name = 'visit';

-- Who can see the numbers. Add someone with: insert into public.admins select id from public.profiles where username = '…';
create table if not exists public.admins (
  user_id   uuid primary key references public.profiles (id) on delete cascade,
  added_at  timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant all on public.admins to service_role;
insert into public.admins (user_id) select id from public.profiles where username = 'cagla' on conflict do nothing;

create or replace function public.growth_numbers(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  v_out jsonb;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Only for Bottega''s team.';
  end if;

  with people as (
    select p.id, p.created_at,
           coalesce(u.is_anonymous, false) as guest,
           (select e.detail from public.events e
             where e.user_id = p.id and e.name = 'room_claimed' order by e.at desc limit 1) as claim
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.created_at >= v_from
  ),
  sourced as (
    select id, created_at, guest,
           case
             when claim like 'via:%' then substr(claim, 5)
             when claim like 'guest:%' then 'club ' || substr(claim, 7)
             when claim = 'from_room' then 'a friend''s room'
             when claim is null then 'not tracked'
             else 'direct'
           end as source
    from people
  ),
  measured as (
    select s.*,
           (select count(*) from public.pieces x where x.owner_id = s.id and x.created_at <= s.created_at + interval '1 day') >= 5 as room5,
           exists (select 1 from public.friendships f where f.status = 'accepted' and s.id in (f.requester, f.addressee)) as friend,
           s.created_at <= now() - interval '14 days' as can_return,
           exists (select 1 from public.events e where e.user_id = s.id and e.name = 'open'
                   and e.at >= s.created_at + interval '7 days' and e.at < s.created_at + interval '14 days') as returned
    from sourced s
  ),
  visits as (
    select substr(detail, 5) as source, count(distinct visitor) as visitors
    from public.events where name = 'visit' and at >= v_from and detail like 'via:%'
    group by 1
  ),
  by_source as (
    select coalesce(m.source, v.source) as source,
           coalesce(v.visitors, 0) as visitors,
           count(m.id) as signups,
           count(m.id) filter (where m.room5) as room5,
           count(m.id) filter (where m.friend) as friend,
           count(m.id) filter (where m.can_return) as can_return,
           count(m.id) filter (where m.can_return and m.returned) as returned
    from measured m
    full join visits v on v.source = m.source
    group by 1, 2
  )
  select jsonb_build_object(
    'days', p_days,
    'totals', jsonb_build_object(
      'people', (select count(*) from public.profiles),
      'public_rooms', (select count(*) from public.rooms where visibility = 'public'),
      'pieces', (select count(*) from public.pieces),
      'clubs', (select count(*) from public.clubs),
      'signups', (select count(*) from measured),
      'guests', (select count(*) from measured where guest),
      'room5', (select count(*) from measured where room5),
      'friend', (select count(*) from measured where friend),
      'can_return', (select count(*) from measured where can_return),
      'returned', (select count(*) from measured where can_return and returned)),
    'sources', coalesce((select jsonb_agg(to_jsonb(b) order by b.signups desc, b.visitors desc) from by_source b), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'signups', d.n) order by d.day)
              from (select date_trunc('day', created_at)::date as day, count(*) as n from measured group by 1) d), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;
revoke execute on function public.growth_numbers(int) from public, anon;
grant execute on function public.growth_numbers(int) to authenticated;
