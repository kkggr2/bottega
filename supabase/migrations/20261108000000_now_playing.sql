-- Bottega: what's on right now in each room.
-- A record left on the turntable, a film in the TV, a book open on the armchair.
-- Any, some or none can be set; each stays until it's changed. Friends see what changed.
-- Run this in the Supabase SQL editor. It is safe to run again.

alter table public.rooms
  add column if not exists now_song    uuid references public.pieces (id) on delete set null,
  add column if not exists now_song_at timestamptz,
  add column if not exists now_film    uuid references public.pieces (id) on delete set null,
  add column if not exists now_film_at timestamptz,
  add column if not exists now_book    uuid references public.pieces (id) on delete set null,
  add column if not exists now_book_at timestamptz;

-- Each slot may only hold a piece from the same room, of the right kind.
-- The times are set here, by the database, so they can't be made up.
create or replace function public.check_now_playing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.now_song is distinct from old.now_song then
    if new.now_song is not null and not exists (
      select 1 from public.pieces where id = new.now_song and owner_id = new.owner_id and type = 'song') then
      raise exception 'That record isn''t in this room.';
    end if;
    new.now_song_at := case when new.now_song is null then null else now() end;
  else
    new.now_song_at := old.now_song_at;
  end if;

  if new.now_film is distinct from old.now_film then
    if new.now_film is not null and not exists (
      select 1 from public.pieces where id = new.now_film and owner_id = new.owner_id and type in ('scene', 'poster')) then
      raise exception 'That film isn''t in this room.';
    end if;
    new.now_film_at := case when new.now_film is null then null else now() end;
  else
    new.now_film_at := old.now_film_at;
  end if;

  if new.now_book is distinct from old.now_book then
    if new.now_book is not null and not exists (
      select 1 from public.pieces where id = new.now_book and owner_id = new.owner_id and type = 'book') then
      raise exception 'That book isn''t in this room.';
    end if;
    new.now_book_at := case when new.now_book is null then null else now() end;
  else
    new.now_book_at := old.now_book_at;
  end if;

  return new;
end $$;

drop trigger if exists rooms_now_playing on public.rooms;
create trigger rooms_now_playing before update on public.rooms
  for each row execute function public.check_now_playing();

-- Log it with the other growth events.
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'open', 'landing', 'example', 'room_view', 'make_yours',
  'account_created', 'room_claimed', 'piece_added', 'import',
  'share_link', 'share_picture', 'friend_request', 'made_public', 'now_set'));
