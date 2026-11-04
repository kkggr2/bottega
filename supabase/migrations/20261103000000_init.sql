-- Bottega: everyone gets one room, friends visit each other's rooms.
-- Run this once in the Supabase SQL editor (or with `supabase db push`).

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    citext not null unique
              check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at  timestamptz not null default now()
);

create table public.rooms (
  owner_id    uuid primary key references public.profiles (id) on delete cascade,
  name        text not null default 'Untitled room' check (char_length(name) between 1 and 48),
  tagline     text not null default '' check (char_length(tagline) <= 140),
  theme       text not null default 'oak'
              check (theme in ('oak', 'midnight', 'rose', 'moss', 'seaglass', 'gallery')),
  wallpaper   text not null default 'plain'
              check (wallpaper in ('plain', 'stripe', 'dots', 'grid', 'damask')),
  visibility  text not null default 'friends'
              check (visibility in ('friends', 'public', 'private')),
  updated_at  timestamptz not null default now()
);

create table public.pieces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.rooms (owner_id) on delete cascade,
  type        text not null check (type in ('poster', 'scene', 'poem', 'game', 'song')),
  title       text not null check (char_length(title) between 1 and 80),
  subtitle    text not null default '' check (char_length(subtitle) <= 80),
  body        text not null default '' check (char_length(body) <= 4000),
  image_path  text check (image_path is null or image_path like owner_id::text || '/%'),
  audio_path  text check (audio_path is null or audio_path like owner_id::text || '/%'),
  link        text check (link is null or (link ~ '^https://\S+$' and char_length(link) between 11 and 500)),
  position    double precision not null default extract(epoch from now()),
  created_at  timestamptz not null default now()
);
create index pieces_owner_position on public.pieces (owner_id, position);

create table public.friendships (
  requester   uuid not null references public.profiles (id) on delete cascade,
  addressee   uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
-- One friendship per pair, whichever direction it started from.
create unique index friendships_pair on public.friendships
  (least(requester, addressee), greatest(requester, addressee));

-- A room holds at most 40 pieces.
create function public.enforce_piece_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.pieces where owner_id = new.owner_id) >= 40 then
    raise exception 'A room holds 40 pieces. Take one down to make space.';
  end if;
  return new;
end $$;
create trigger pieces_limit before insert on public.pieces
  for each row execute function public.enforce_piece_limit();

-- Usernames can't change once claimed.
create function public.freeze_username() returns trigger
language plpgsql as $$
begin
  if new.username <> old.username then
    raise exception 'Usernames cannot be changed.';
  end if;
  return new;
end $$;
create trigger profiles_freeze_username before update on public.profiles
  for each row execute function public.freeze_username();

create function public.touch_room() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger rooms_touch before update on public.rooms
  for each row execute function public.touch_room();

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

create function public.can_view_room(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
      or exists (
        select 1 from public.rooms r
        where r.owner_id = owner
          and (r.visibility = 'public'
               or (r.visibility = 'friends' and public.are_friends(owner, auth.uid())))
      );
$$;

-- Claim a username and open a room in one step.
create function public.claim_username(p_username text, p_room_name text, p_theme text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'You already have a username.';
  end if;
  insert into public.profiles (id, username) values (auth.uid(), lower(p_username));
  insert into public.rooms (owner_id, name, theme)
    values (auth.uid(),
            coalesce(nullif(trim(p_room_name), ''), lower(p_username) || '''s room'),
            coalesce(nullif(p_theme, ''), 'oak'));
exception
  when unique_violation then
    raise exception 'That username is taken.';
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.rooms       enable row level security;
alter table public.pieces      enable row level security;
alter table public.friendships enable row level security;

-- Usernames are public to signed-in people so friends can find each other.
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);

-- Room doors (name, theme) are visible to signed-in people; the walls follow visibility.
create policy "rooms readable" on public.rooms
  for select to authenticated using (true);
create policy "rooms owner update" on public.rooms
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "pieces readable when room is" on public.pieces
  for select to authenticated using (public.can_view_room(owner_id));
create policy "pieces owner insert" on public.pieces
  for insert to authenticated with check (owner_id = auth.uid());
create policy "pieces owner update" on public.pieces
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "pieces owner delete" on public.pieces
  for delete to authenticated using (owner_id = auth.uid());

create policy "friendships involved read" on public.friendships
  for select to authenticated using (auth.uid() in (requester, addressee));
create policy "friendships request" on public.friendships
  for insert to authenticated with check (requester = auth.uid() and status = 'pending');
create policy "friendships accept" on public.friendships
  for update to authenticated using (addressee = auth.uid()) with check (status = 'accepted');
create policy "friendships remove" on public.friendships
  for delete to authenticated using (auth.uid() in (requester, addressee));

-- Table privileges are granted explicitly, so this works whether or not the project
-- exposes new tables automatically. Signed-out visitors (anon) get nothing.
revoke all on public.profiles, public.rooms, public.pieces, public.friendships from anon, authenticated;
grant usage on schema public to authenticated;
-- Profiles are created only through claim_username.
grant select on public.profiles to authenticated;
grant select, update on public.rooms to authenticated;
grant select, insert, update, delete on public.pieces to authenticated;
-- Only the status column of a friendship can ever be updated.
grant select, insert, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

revoke execute on function public.are_friends(uuid, uuid), public.can_view_room(uuid),
  public.claim_username(text, text, text) from public, anon;
grant execute on function public.are_friends(uuid, uuid), public.can_view_room(uuid),
  public.claim_username(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: images and song clips live under media/<owner id>/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
              'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/wav'])
on conflict (id) do nothing;

create policy "media read when room is" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.can_view_room(((storage.foldername(name))[1])::uuid));
create policy "media owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Realtime: rooms update live while you're inside them.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.pieces, public.rooms, public.friendships;
