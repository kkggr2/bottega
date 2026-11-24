-- Running a club like a WhatsApp group: co-hosts, removing or banning someone, and deleting any message.
--   * The owner (clubs.host) can make members co-hosts. Co-hosts can fill the shelf, run votes, remove
--     members and delete messages. Only the owner can hand the club over or delete it.
--   * Hosts (owner and co-hosts) can remove a member, or ban them: a banned person can't join again from
--     the link, and their messages in the club chat are deleted. The owner can't be removed, and a co-host
--     can't remove another co-host (only the owner can).
-- Run this in the Supabase SQL editor after 20261121000000_club_hosts.sql. It is safe to run again.

alter table public.club_members add column if not exists role text not null default 'member';
alter table public.club_members drop constraint if exists club_members_role_check;
alter table public.club_members add constraint club_members_role_check check (role in ('member', 'cohost'));

-- Owner or co-host. This is what the shelf and the votes already check, so co-hosts get them too.
create or replace function public.is_club_host(p_club uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clubs where id = p_club and host = p_user)
      or exists (select 1 from public.club_members where club_id = p_club and user_id = p_user and role = 'cohost');
$$;
revoke execute on function public.is_club_host(uuid, uuid) from public, anon;
grant execute on function public.is_club_host(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Bans
-- ---------------------------------------------------------------------------

create table if not exists public.club_bans (
  club_id    uuid not null references public.clubs (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  banned_by  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
alter table public.club_bans enable row level security;
revoke all on public.club_bans from anon, authenticated;
grant select, insert, update, delete on public.club_bans to service_role;

-- ---------------------------------------------------------------------------
-- Co-hosts, removing, banning
-- ---------------------------------------------------------------------------

-- The owner makes a member a co-host, or takes it back. Guests (no email yet) can't be co-hosts.
create or replace function public.set_club_cohost(p_club uuid, p_user uuid, p_on boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.clubs where id = p_club and host = auth.uid()) then
    raise exception 'Only the club''s owner can do that.';
  end if;
  if p_user = auth.uid() then return; end if;
  if not public.is_club_member(p_club, p_user) then raise exception 'They need to join the club first.'; end if;
  if p_on and exists (select 1 from auth.users where id = p_user and is_anonymous) then
    raise exception 'They need to add their email before they can be a co-host.';
  end if;
  update public.club_members set role = case when p_on then 'cohost' else 'member' end
  where club_id = p_club and user_id = p_user;
end $$;
revoke execute on function public.set_club_cohost(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_club_cohost(uuid, uuid, boolean) to authenticated;

-- A host removes someone from the club. With p_ban, they can't come back from the link,
-- and their messages in the club chat are deleted.
create or replace function public.remove_club_member(p_club uuid, p_user uuid, p_ban boolean default false)
returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_slug text; v_role text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not public.is_club_host(p_club, auth.uid()) then raise exception 'Only the club''s hosts can do that.'; end if;
  select host, slug into v_owner, v_slug from public.clubs where id = p_club;
  if p_user = auth.uid() then raise exception 'To go, leave the club instead.'; end if;
  if p_user = v_owner then raise exception 'The club''s owner can''t be removed.'; end if;
  select role into v_role from public.club_members where club_id = p_club and user_id = p_user;
  if v_role = 'cohost' and auth.uid() <> v_owner then
    raise exception 'Only the club''s owner can remove a co-host.';
  end if;
  delete from public.club_members where club_id = p_club and user_id = p_user;
  delete from public.club_votes v using public.club_polls p
    where v.poll_id = p.id and p.club_id = p_club and v.user_id = p_user
      and p.closed_at is null;
  if p_ban then
    insert into public.club_bans (club_id, user_id, banned_by) values (p_club, p_user, auth.uid())
      on conflict (club_id, user_id) do nothing;
    delete from public.chat_messages where room_key = 'club:' || v_slug and author = p_user;
  end if;
end $$;
revoke execute on function public.remove_club_member(uuid, uuid, boolean) from public, anon;
grant execute on function public.remove_club_member(uuid, uuid, boolean) to authenticated;

create or replace function public.unban_club_member(p_club uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_club_host(p_club, auth.uid()) then raise exception 'Only the club''s hosts can do that.'; end if;
  delete from public.club_bans where club_id = p_club and user_id = p_user;
end $$;
revoke execute on function public.unban_club_member(uuid, uuid) from public, anon;
grant execute on function public.unban_club_member(uuid, uuid) to authenticated;

-- Who's banned, for the club's hosts.
create or replace function public.club_banned(p_club uuid)
returns table (user_id uuid, username text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.user_id, p.username::text, b.created_at
  from public.club_bans b join public.profiles p on p.id = b.user_id
  where b.club_id = p_club and public.is_club_host(p_club, auth.uid())
  order by b.created_at desc;
$$;
revoke execute on function public.club_banned(uuid) from public, anon;
grant execute on function public.club_banned(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Joining: banned people can't come back from the link
-- ---------------------------------------------------------------------------

create or replace function public.join_club(p_slug text, p_source text default 'link')
returns uuid
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into c from public.clubs where slug = lower(btrim(p_slug));
  if c.id is null then raise exception 'There''s no club at that link.'; end if;
  if public.is_blocked(c.host, auth.uid())
     or exists (select 1 from public.club_bans b where b.club_id = c.id and b.user_id = auth.uid()) then
    raise exception 'You can''t join this club.';
  end if;
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

-- ---------------------------------------------------------------------------
-- Hosts can delete any message in their club's chat
-- ---------------------------------------------------------------------------

drop policy if exists "club hosts remove club messages" on public.chat_messages;
create policy "club hosts remove club messages" on public.chat_messages
  for delete to authenticated
  using (room_key like 'club:%' and exists (
    select 1 from public.clubs c
    where 'club:' || c.slug = room_key and public.is_club_host(c.id, auth.uid())));

-- ---------------------------------------------------------------------------
-- What the app reads: roles in "my clubs" and the members list
-- ---------------------------------------------------------------------------

-- is_host: owner or co-host (can run the club). is_owner: the one who can hand it over or delete it.
drop function if exists public.my_clubs();
create function public.my_clubs()
returns table (id uuid, slug text, name text, emoji text, is_host boolean, members int, messages int, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.name, c.emoji, c.host = auth.uid() or m.role = 'cohost',
         (select count(*)::int from public.club_members x where x.club_id = c.id),
         (select count(*)::int from public.chat_messages cm where cm.room_key = 'club:' || c.slug and cm.created_at > now() - interval '24 hours'),
         c.host = auth.uid()
  from public.clubs c join public.club_members m on m.club_id = c.id and m.user_id = auth.uid()
  order by c.name;
$$;
revoke execute on function public.my_clubs() from public, anon;
grant execute on function public.my_clubs() to authenticated;

-- The members list gains each person's role: owner, cohost or member.
drop function if exists public.club_roster(uuid);
create function public.club_roster(p_club uuid)
returns table (user_id uuid, username text, joined_at timestamptz, is_host boolean, relation text, now_title text, role text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.username::text, m.joined_at, m.user_id = c.host,
         case
           when m.user_id = auth.uid() then 'me'
           when public.are_friends(m.user_id, auth.uid()) then 'friends'
           when exists (select 1 from public.friendships f where f.requester = auth.uid() and f.addressee = m.user_id) then 'asked'
           when exists (select 1 from public.friendships f where f.requester = m.user_id and f.addressee = auth.uid()) then 'asking'
           else 'none'
         end,
         (select n.title from public.now_on() n where n.owner_id = m.user_id order by n.slot limit 1),
         case when m.user_id = c.host then 'owner' else m.role end
  from public.club_members m
  join public.clubs c on c.id = m.club_id
  join public.profiles p on p.id = m.user_id
  where m.club_id = p_club
    and public.is_club_member(p_club, auth.uid())
    and not public.is_blocked(m.user_id, auth.uid())
  order by m.user_id = c.host desc, m.role = 'cohost' desc, m.joined_at;
$$;
revoke execute on function public.club_roster(uuid) from public, anon;
grant execute on function public.club_roster(uuid) to authenticated;

-- Co-hosts see the club's numbers too.
create or replace function public.club_stats(p_club uuid)
returns table (members int, joined_7d int, came_back int, active_7d int)
language sql stable security definer set search_path = public as $$
  with m as (
    select cm.user_id, cm.joined_at from public.club_members cm
    join public.clubs c on c.id = cm.club_id
    where cm.club_id = p_club and public.is_club_host(p_club, auth.uid()) and cm.user_id <> c.host
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
