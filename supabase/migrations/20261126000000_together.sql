-- Rooms for two: a couple, flatmates or best friends share one room ("our living room").
-- One of you starts it from the other's room (you must be friends); the other accepts from their Library.
-- Both of you hang and take down pieces; friends of either of you can visit, like a personal room.
-- Personal rooms are untouched: these live in their own tables.
-- Run this in the Supabase SQL editor. It is safe to run again.

create table if not exists public.together_rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  theme       text not null default 'oak' check (theme in ('oak', 'midnight', 'rose', 'moss', 'seaglass', 'gallery')),
  wallpaper   text not null default 'stripe' check (wallpaper in ('plain', 'stripe', 'dots', 'grid', 'damask')),
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.together_rooms enable row level security;

create table if not exists public.together_members (
  room_id     uuid not null references public.together_rooms (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'invited' check (status in ('invited', 'joined')),
  joined_at   timestamptz,
  primary key (room_id, user_id)
);
create index if not exists together_members_user on public.together_members (user_id);
alter table public.together_members enable row level security;

create table if not exists public.together_pieces (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.together_rooms (id) on delete cascade,
  added_by    uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in ('poster', 'book', 'song')),
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  subtitle    text not null default '' check (char_length(subtitle) <= 120),
  cover_url   text check (cover_url is null
                or cover_url ~ '^https://(is[0-9]+-ssl\.mzstatic\.com|covers\.openlibrary\.org|i\.ytimg\.com|image\.tmdb\.org)/'),
  preview_url text check (preview_url is null or preview_url ~ '^https://audio-ssl\.itunes\.apple\.com/'),
  body        text not null default '' check (char_length(body) <= 500),
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists together_pieces_room on public.together_pieces (room_id, position);
alter table public.together_pieces enable row level security;

-- Who's in: joined members hang things; invited ones can only see the invitation.
create or replace function public.is_together_member(p_room uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.together_members where room_id = p_room and user_id = p_user and status = 'joined');
$$;

-- Who can come in: the two of you, and friends of either of you (unless blocked by either).
create or replace function public.can_view_together(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_together_member(p_room, auth.uid())
    or (
      exists (select 1 from public.together_members m
              where m.room_id = p_room and m.status = 'joined' and public.are_friends(m.user_id, auth.uid()))
      and not exists (select 1 from public.together_members m
              where m.room_id = p_room and public.is_blocked(m.user_id, auth.uid()))
    )
  );
$$;
-- In it at all, joined or invited (so an invitation can be read before it's accepted).
create or replace function public.in_together(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.together_members where room_id = p_room and user_id = auth.uid());
$$;
revoke execute on function public.is_together_member(uuid, uuid), public.can_view_together(uuid), public.in_together(uuid) from public, anon;
grant execute on function public.is_together_member(uuid, uuid), public.can_view_together(uuid), public.in_together(uuid) to authenticated;

drop policy if exists "together rooms visible" on public.together_rooms;
create policy "together rooms visible" on public.together_rooms
  for select to authenticated using (
    public.can_view_together(id) or public.in_together(id));
drop policy if exists "together rooms changed by members" on public.together_rooms;
create policy "together rooms changed by members" on public.together_rooms
  for update to authenticated using (public.is_together_member(id, auth.uid())) with check (public.is_together_member(id, auth.uid()));

drop policy if exists "together members visible" on public.together_members;
create policy "together members visible" on public.together_members
  for select to authenticated using (
    user_id = auth.uid() or public.can_view_together(room_id) or public.in_together(room_id));

drop policy if exists "together pieces visible" on public.together_pieces;
create policy "together pieces visible" on public.together_pieces
  for select to authenticated using (public.can_view_together(room_id));
drop policy if exists "together pieces hung by members" on public.together_pieces;
create policy "together pieces hung by members" on public.together_pieces
  for insert to authenticated with check (
    added_by = auth.uid() and public.is_together_member(room_id, auth.uid())
    and (select count(*) from public.together_pieces p where p.room_id = together_pieces.room_id) < 60);
drop policy if exists "together pieces arranged by members" on public.together_pieces;
create policy "together pieces arranged by members" on public.together_pieces
  for update to authenticated using (public.is_together_member(room_id, auth.uid())) with check (public.is_together_member(room_id, auth.uid()));
drop policy if exists "together pieces taken down by members" on public.together_pieces;
create policy "together pieces taken down by members" on public.together_pieces
  for delete to authenticated using (public.is_together_member(room_id, auth.uid()));

revoke all on public.together_rooms, public.together_members, public.together_pieces from anon, authenticated;
grant select on public.together_rooms, public.together_members, public.together_pieces to authenticated;
grant update (name, theme, wallpaper) on public.together_rooms to authenticated;
grant insert (room_id, added_by, type, title, subtitle, cover_url, preview_url, body, position) on public.together_pieces to authenticated;
grant update (body, position) on public.together_pieces to authenticated;
grant delete on public.together_pieces to authenticated;
grant all on public.together_rooms, public.together_members, public.together_pieces to service_role;

-- Start a room with a friend: you're in, they're invited. Up to 3 shared rooms each, one per pair.
create or replace function public.start_together(p_friend uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if public.is_guest() then raise exception 'Add your email first: guests can''t share a room yet.'; end if;
  if p_friend = auth.uid() or not public.are_friends(p_friend, auth.uid()) then
    raise exception 'You can only share a room with a friend.';
  end if;
  if public.is_offensive(p_name) then raise exception 'Keep it kind: that name has words Bottega doesn''t allow.'; end if;
  if (select count(*) from public.together_members where user_id = auth.uid()) >= 3
     or (select count(*) from public.together_members where user_id = p_friend) >= 3 then
    raise exception 'Each person can share up to 3 rooms.';
  end if;
  if exists (select 1 from public.together_members a join public.together_members b on a.room_id = b.room_id
             where a.user_id = auth.uid() and b.user_id = p_friend) then
    raise exception 'You already share a room with them.';
  end if;
  insert into public.together_rooms (name, created_by) values (btrim(p_name), auth.uid()) returning id into v_id;
  insert into public.together_members (room_id, user_id, status, joined_at) values (v_id, auth.uid(), 'joined', now());
  insert into public.together_members (room_id, user_id, status) values (v_id, p_friend, 'invited');
  return v_id;
end $$;

-- Yes moves you in; no takes the room down (it was only ever the two of you).
create or replace function public.answer_together(p_room uuid, p_yes boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.together_members where room_id = p_room and user_id = auth.uid() and status = 'invited') then
    raise exception 'That invitation isn''t there any more.';
  end if;
  if p_yes then
    update public.together_members set status = 'joined', joined_at = now() where room_id = p_room and user_id = auth.uid();
  else
    delete from public.together_rooms where id = p_room;
  end if;
end $$;

-- Leave: your key goes back. When nobody is left, the room and its pieces go too.
create or replace function public.leave_together(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.together_members where room_id = p_room and user_id = auth.uid();
  if not exists (select 1 from public.together_members where room_id = p_room and status = 'joined') then
    delete from public.together_rooms where id = p_room;
  end if;
end $$;

-- Your shared rooms and invitations, with the other person and a few covers, for the Library.
create or replace function public.my_together() returns table (
  room_id uuid, name text, theme text, status text, partner text, partner_status text, invited_by_me boolean, covers text[])
language sql stable security definer set search_path = public as $$
  select r.id, r.name, r.theme, me.status, p.username::text, other.status, r.created_by = auth.uid(),
         array(select x.cover_url from public.together_pieces x where x.room_id = r.id and x.cover_url is not null
               order by x.position, x.created_at limit 3)
  from public.together_members me
  join public.together_rooms r on r.id = me.room_id
  left join public.together_members other on other.room_id = r.id and other.user_id <> me.user_id
  left join public.profiles p on p.id = other.user_id
  where me.user_id = auth.uid()
  order by r.created_at;
$$;

revoke execute on function public.start_together(uuid, text), public.answer_together(uuid, boolean),
  public.leave_together(uuid), public.my_together() from public, anon;
grant execute on function public.start_together(uuid, text), public.answer_together(uuid, boolean),
  public.leave_together(uuid), public.my_together() to authenticated;
