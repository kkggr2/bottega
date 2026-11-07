-- Bottega: let signed-out visitors step into public rooms, and keep a small event log
-- for the growth numbers (published rooms, shares, people coming back).
-- Run this once in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Public rooms open to everyone, including people without an account
-- ---------------------------------------------------------------------------

grant usage on schema public to anon;

-- Only the owners of public rooms are visible to signed-out visitors.
create policy "profiles with public rooms" on public.profiles
  for select to anon
  using (exists (select 1 from public.rooms r where r.owner_id = profiles.id and r.visibility = 'public'));

create policy "public rooms readable" on public.rooms
  for select to anon
  using (visibility = 'public');

create policy "pieces readable in public rooms" on public.pieces
  for select to anon
  using (public.can_view_room(owner_id));

grant select on public.profiles, public.rooms, public.pieces to anon;
grant execute on function public.can_view_room(uuid) to anon;

create policy "media readable in public rooms" on storage.objects
  for select to anon
  using (bucket_id = 'media' and public.can_view_room(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------
-- Event log: write-only from the app, read only here in the dashboard
-- ---------------------------------------------------------------------------

create table public.events (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  name        text not null check (name in (
                'open', 'landing', 'example', 'room_view', 'make_yours',
                'account_created', 'room_claimed', 'piece_added', 'import',
                'share_link', 'share_picture', 'friend_request', 'made_public')),
  visitor     uuid not null,          -- a random id kept on the device
  user_id     uuid,                   -- the signed-in person, if any
  room_owner  uuid,                   -- whose room it happened in
  detail      text not null default '' check (char_length(detail) <= 40)
);
create index events_name_at on public.events (name, at);
create index events_user on public.events (user_id, at) where user_id is not null;
create index events_visitor on public.events (visitor);

alter table public.events enable row level security;

create policy "visitors log events" on public.events
  for insert to anon
  with check (user_id is null);
create policy "people log their own events" on public.events
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

revoke all on public.events from anon, authenticated;
grant insert (name, visitor, user_id, room_owner, detail) on public.events to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Growth numbers. Not exposed to the app: open them in the SQL editor with
--   select * from metrics_cohorts;
--   select * from metrics_visitors;
--   select * from metrics_daily;
-- "five_pieces" is a room with at least 5 pieces; the return rate below is for those rooms.
-- See docs/STRATEGY.md for the targets.
-- ---------------------------------------------------------------------------

create view public.metrics_cohorts with (security_invoker = true) as
with fifth as (
  select owner_id, created_at as fifth_at
  from (select owner_id, created_at, row_number() over (partition by owner_id order by created_at) as n
        from public.pieces) p
  where n = 5
)
select
  date_trunc('week', pr.created_at)::date                                                   as cohort_week,
  count(*)                                                                                  as creators,
  count(*) filter (where f.fifth_at <= pr.created_at + interval '24 hours')                 as published_24h,
  round(100.0 * count(*) filter (where f.fifth_at <= pr.created_at + interval '24 hours') / count(*), 1)
                                                                                            as published_24h_pct,
  count(*) filter (where exists (
    select 1 from public.events e
    where e.user_id = pr.id and e.name in ('share_link', 'share_picture')
      and e.at <= pr.created_at + interval '7 days'))                                       as shared_7d,
  round(100.0 * count(*) filter (where exists (
    select 1 from public.events e
    where e.user_id = pr.id and e.name in ('share_link', 'share_picture')
      and e.at <= pr.created_at + interval '7 days')) / count(*), 1)                        as shared_7d_pct,
  count(*) filter (where (
    select count(*) from public.friendships fr
    where fr.status = 'accepted' and pr.id in (fr.requester, fr.addressee)
      and fr.created_at <= pr.created_at + interval '7 days') >= 3)                         as friends3_7d,
  count(f.owner_id)                                                                         as five_pieces,
  count(*) filter (where f.owner_id is not null and exists (
    select 1 from public.events e
    where e.user_id = pr.id and e.name = 'open'
      and e.at >= pr.created_at + interval '21 days' and e.at < pr.created_at + interval '28 days'))
                                                                                            as activated_returned_day22_28,
  round(100.0 * count(*) filter (where f.owner_id is not null and exists (
    select 1 from public.events e
    where e.user_id = pr.id and e.name = 'open'
      and e.at >= pr.created_at + interval '21 days' and e.at < pr.created_at + interval '28 days'))
    / nullif(count(f.owner_id), 0), 1)                                                      as activated_returned_pct
from public.profiles pr
left join fifth f on f.owner_id = pr.id
group by 1
order by 1 desc;

-- Visitors who saw a room or the example before having an account, and how many went on to make one.
create view public.metrics_visitors with (security_invoker = true) as
with first_seen as (
  select visitor, min(at) as at
  from public.events
  where name in ('landing', 'example', 'room_view') and user_id is null
  group by visitor
),
made as (
  select distinct visitor from public.events where name = 'room_claimed'
)
select
  date_trunc('week', s.at)::date                                         as week,
  count(*)                                                               as visitors,
  count(m.visitor)                                                       as made_a_room,
  round(100.0 * count(m.visitor) / count(*), 1)                          as visitor_to_creator_pct,
  (select count(*) from public.events e
    where e.name = 'room_view' and e.detail in ('friend', 'member', 'signed_out')
      and date_trunc('week', e.at) = date_trunc('week', s.at))           as visits_to_others_rooms
from first_seen s
left join made m on m.visitor = s.visitor
group by 1
order by 1 desc;

create view public.metrics_daily with (security_invoker = true) as
select at::date as day, name, count(*) as events, count(distinct coalesce(user_id, visitor)) as people
from public.events
group by 1, 2
order by 1 desc, 2;

revoke all on public.metrics_cohorts, public.metrics_visitors, public.metrics_daily from anon, authenticated;
