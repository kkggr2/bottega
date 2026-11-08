-- Bottega: blocking, reporting, and deleting an account. Apple requires all three for social apps.
-- Run this in the Supabase SQL editor. It is safe to run again.

-- ---------------------------------------------------------------------------
-- Blocking: a blocked person can't see your room or send you friend requests,
-- and any friendship between you is removed.
-- ---------------------------------------------------------------------------

create table if not exists public.blocks (
  blocker     uuid not null references public.profiles (id) on delete cascade,
  blocked     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;

drop policy if exists "own blocks read" on public.blocks;
create policy "own blocks read" on public.blocks for select to authenticated using (blocker = auth.uid());
drop policy if exists "own blocks add" on public.blocks;
create policy "own blocks add" on public.blocks for insert to authenticated with check (blocker = auth.uid());
drop policy if exists "own blocks remove" on public.blocks;
create policy "own blocks remove" on public.blocks for delete to authenticated using (blocker = auth.uid());

revoke all on public.blocks from anon, authenticated;
grant select, delete on public.blocks to authenticated;
grant insert (blocker, blocked) on public.blocks to authenticated;

create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks
                 where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
revoke execute on function public.is_blocked(uuid, uuid) from public, anon;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- Blocking removes the friendship.
create or replace function public.unfriend_on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships
  where (requester = new.blocker and addressee = new.blocked)
     or (requester = new.blocked and addressee = new.blocker);
  return new;
end $$;
drop trigger if exists blocks_unfriend on public.blocks;
create trigger blocks_unfriend after insert on public.blocks
  for each row execute function public.unfriend_on_block();

-- No friend requests between people where either blocked the other.
drop policy if exists "friendships request" on public.friendships;
create policy "friendships request" on public.friendships
  for insert to authenticated
  with check (requester = auth.uid() and status = 'pending' and not public.is_blocked(requester, addressee));

-- Rooms stay closed to anyone the owner blocked (same rules as before otherwise).
create or replace function public.can_view_room(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
      or (
        not (auth.uid() is not null and public.is_blocked(owner, auth.uid()))
        and exists (
          select 1 from public.rooms r
          where r.owner_id = owner
            and (r.visibility = 'public'
                 or (r.visibility = 'friends' and public.are_friends(owner, auth.uid())))
        )
      );
$$;

-- ---------------------------------------------------------------------------
-- Reports: anyone signed in can report a room. Only the server reads them,
-- and it emails hello@bottegarooms.com right away.
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  reporter    uuid references public.profiles (id) on delete set null,
  owner_id    uuid references public.profiles (id) on delete set null,
  reason      text not null check (char_length(reason) between 1 and 500),
  created_at  timestamptz not null default now(),
  resolved    boolean not null default false
);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Deleting an account: the server deletes the sign-in, which removes the profile, room, pieces,
-- friendships, blocks, email and phone settings. Growth events are kept but no longer linked to the person.
-- ---------------------------------------------------------------------------

create or replace function public.forget_user_events(p_user uuid) returns void
language sql security definer set search_path = public as $$
  update public.events set user_id = null where user_id = p_user;
  update public.events set room_owner = null where room_owner = p_user;
$$;
revoke execute on function public.forget_user_events(uuid) from public, anon, authenticated;
grant execute on function public.forget_user_events(uuid) to service_role;
