-- Bottega: clubs. A film club, book club or group of friends gets one invite link
-- (bottegarooms.com/join/gray-fox). Joining connects you with the club's host, shows you the other
-- members to swap keys with, and opens a club chat that stays open (messages last a week).
-- Also: an invite that survives an App Store install, matched for one hour on a scrambled network address.
-- Run this in the Supabase SQL editor after 20261115000000_chat.sql. It is safe to run again.

create table if not exists public.clubs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  emoji       text not null default '🎬' check (char_length(emoji) between 1 and 8),
  host        uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.clubs enable row level security;

create table if not exists public.club_members (
  club_id    uuid not null references public.clubs (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  source     text check (char_length(source) <= 20),
  primary key (club_id, user_id)
);
create index if not exists club_members_user on public.club_members (user_id);
alter table public.club_members enable row level security;

create or replace function public.is_club_member(p_club uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.club_members where club_id = p_club and user_id = p_user);
$$;
revoke execute on function public.is_club_member(uuid, uuid) from public, anon;
grant execute on function public.is_club_member(uuid, uuid) to authenticated;

drop policy if exists "clubs readable by members" on public.clubs;
create policy "clubs readable by members" on public.clubs
  for select to authenticated using (public.is_club_member(id, auth.uid()));
drop policy if exists "members see each other" on public.club_members;
create policy "members see each other" on public.club_members
  for select to authenticated using (public.is_club_member(club_id, auth.uid()));
drop policy if exists "leave a club" on public.club_members;
create policy "leave a club" on public.club_members
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.clubs, public.club_members from anon, authenticated;
grant select on public.clubs, public.club_members to authenticated;
grant delete on public.club_members to authenticated;
grant select, insert, update, delete on public.clubs, public.club_members to service_role;

-- Start a club. You're its host and first member. At most 5 clubs per person.
create or replace function public.create_club(p_slug text, p_name text, p_emoji text default '🎬')
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if (select count(*) from public.clubs where host = auth.uid()) >= 5 then
    raise exception 'You can host up to 5 clubs.';
  end if;
  if public.is_offensive(p_name) or public.is_offensive(replace(p_slug, '-', ' ')) then
    raise exception 'Keep it kind: that name has words Bottega doesn''t allow.';
  end if;
  insert into public.clubs (slug, name, emoji, host) values (lower(btrim(p_slug)), btrim(p_name), coalesce(nullif(btrim(p_emoji), ''), '🎬'), auth.uid())
    returning id into v_id;
  insert into public.club_members (club_id, user_id, source) values (v_id, auth.uid(), 'host');
  return v_id;
exception when unique_violation then
  raise exception 'That link is taken. Try another.';
end $$;
revoke execute on function public.create_club(text, text, text) from public, anon;
grant execute on function public.create_club(text, text, text) to authenticated;

-- Join a club by its link. You and the host are connected straight away (both chose this:
-- the host by sharing the link, you by joining), unless one of you blocked the other.
create or replace function public.join_club(p_slug text, p_source text default 'link')
returns uuid
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into c from public.clubs where slug = lower(btrim(p_slug));
  if c.id is null then raise exception 'There''s no club at that link.'; end if;
  if public.is_blocked(c.host, auth.uid()) then raise exception 'You can''t join this club.'; end if;
  insert into public.club_members (club_id, user_id, source) values (c.id, auth.uid(), left(p_source, 20))
    on conflict do nothing;
  if c.host <> auth.uid() then
    -- An earlier request either way becomes a friendship; otherwise start one, already accepted.
    update public.friendships set status = 'accepted'
      where (requester = c.host and addressee = auth.uid()) or (requester = auth.uid() and addressee = c.host);
    if not found then
      insert into public.friendships (requester, addressee, status) values (c.host, auth.uid(), 'accepted');
    end if;
  end if;
  return c.id;
end $$;
revoke execute on function public.join_club(text, text) from public, anon;
grant execute on function public.join_club(text, text) to authenticated;

-- What the join page shows to anyone, signed in or not: the club, its host and how many are in.
create or replace function public.club_public(p_slug text)
returns table (id uuid, slug text, name text, emoji text, host_username text, members int)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.name, c.emoji, p.username::text,
         (select count(*)::int from public.club_members m where m.club_id = c.id)
  from public.clubs c join public.profiles p on p.id = c.host
  where c.slug = lower(btrim(p_slug));
$$;
grant execute on function public.club_public(text) to anon, authenticated;

-- A club's members, for members: who they are, what they have on, and where you stand with them.
create or replace function public.club_roster(p_club uuid)
returns table (user_id uuid, username text, joined_at timestamptz, is_host boolean, relation text, now_title text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.username::text, m.joined_at, m.user_id = c.host,
         case
           when m.user_id = auth.uid() then 'me'
           when public.are_friends(m.user_id, auth.uid()) then 'friends'
           when exists (select 1 from public.friendships f where f.requester = auth.uid() and f.addressee = m.user_id) then 'asked'
           when exists (select 1 from public.friendships f where f.requester = m.user_id and f.addressee = auth.uid()) then 'asking'
           else 'none'
         end,
         (select n.title from public.now_on() n where n.owner_id = m.user_id order by n.slot limit 1)
  from public.club_members m
  join public.clubs c on c.id = m.club_id
  join public.profiles p on p.id = m.user_id
  where m.club_id = p_club
    and public.is_club_member(p_club, auth.uid())
    and not public.is_blocked(m.user_id, auth.uid())
  order by m.user_id = c.host desc, m.joined_at;
$$;
revoke execute on function public.club_roster(uuid) from public, anon;
grant execute on function public.club_roster(uuid) to authenticated;

-- For the host: how the link is doing. Joined, and came back on a later day.
create or replace function public.club_stats(p_club uuid)
returns table (members int, joined_7d int, came_back int, active_7d int)
language sql stable security definer set search_path = public as $$
  with m as (
    select cm.user_id, cm.joined_at from public.club_members cm
    join public.clubs c on c.id = cm.club_id
    where cm.club_id = p_club and c.host = auth.uid() and cm.user_id <> c.host
  )
  select (select count(*)::int from m),
         (select count(*)::int from m where joined_at > now() - interval '7 days'),
         (select count(*)::int from m where exists (
            select 1 from public.events e where e.user_id = m.user_id and e.at > m.joined_at + interval '20 hours')),
         (select count(*)::int from m where exists (
            select 1 from public.events e where e.user_id = m.user_id and e.at > now() - interval '7 days'));
$$;
revoke execute on function public.club_stats(uuid) from public, anon;
grant execute on function public.club_stats(uuid) to authenticated;

-- My clubs, for the library.
create or replace function public.my_clubs()
returns table (id uuid, slug text, name text, emoji text, is_host boolean, members int, messages int)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.name, c.emoji, c.host = auth.uid(),
         (select count(*)::int from public.club_members x where x.club_id = c.id),
         (select count(*)::int from public.chat_messages cm where cm.room_key = 'club:' || c.slug and cm.created_at > now() - interval '24 hours')
  from public.clubs c join public.club_members m on m.club_id = c.id and m.user_id = auth.uid()
  order by c.name;
$$;
revoke execute on function public.my_clubs() from public, anon;
grant execute on function public.my_clubs() to authenticated;

-- ---------------------------------------------------------------------------
-- Club chat: the chat rooms gain one room per club ("club:gray-fox"), open to members,
-- with messages kept for a week instead of a day.
-- ---------------------------------------------------------------------------

create or replace function public.my_chat_keys() returns setof text
language sql stable security definer set search_path = public as $$
  select chat_key from public.now_on() where owner_id = auth.uid()
  union
  select 'club:' || c.slug from public.clubs c join public.club_members m on m.club_id = c.id where m.user_id = auth.uid();
$$;

drop policy if exists "chat readable by people in the room" on public.chat_messages;
create policy "chat readable by people in the room" on public.chat_messages
  for select to authenticated
  using (created_at > now() - case when room_key like 'club:%' then interval '7 days' else interval '24 hours' end
         and room_key in (select public.my_chat_keys())
         and not public.is_blocked(author, auth.uid()));

create or replace function public.purge_chat() returns int
language sql security definer set search_path = public as $$
  with gone as (
    delete from public.chat_messages
    where created_at < now() - case when room_key like 'club:%' then interval '8 days' else interval '48 hours' end
    returning 1)
  select count(*)::int from gone;
$$;

-- ---------------------------------------------------------------------------
-- Invites that survive an App Store install. When someone opens a club or room link on an iPhone
-- without the app, the server keeps "this network was invited to X" for one hour, under a scrambled
-- (hashed, salted) address. If that person signs up in the app within the hour, they land in the club
-- or get the friend request. Nothing else is kept, and it's deleted after an hour.
-- ---------------------------------------------------------------------------

create table if not exists public.pending_invites (
  addr_hash   text not null,
  club_slug   text,
  inviter     text,
  created_at  timestamptz not null default now()
);
create index if not exists pending_invites_addr on public.pending_invites (addr_hash, created_at desc);
alter table public.pending_invites enable row level security;
revoke all on public.pending_invites from anon, authenticated;
grant select, insert, delete on public.pending_invites to service_role;

-- Growth events.
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'open', 'landing', 'example', 'room_view', 'make_yours',
  'account_created', 'room_claimed', 'piece_added', 'import',
  'share_link', 'share_picture', 'friend_request', 'made_public', 'now_set',
  'quiz_start', 'quiz_done', 'chat_open', 'chat_send', 'dm_send',
  'club_view', 'club_join', 'club_create'));
