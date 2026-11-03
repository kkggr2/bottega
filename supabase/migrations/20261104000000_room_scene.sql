-- Bottega: books, searched cover art, song previews and scene clips.
-- Run this once in the Supabase SQL editor after 20261103000000_init.sql.

alter table public.pieces drop constraint pieces_type_check;
alter table public.pieces add constraint pieces_type_check
  check (type in ('poster', 'scene', 'poem', 'game', 'song', 'book'));

alter table public.pieces
  -- Cover art found by search, served by the source (Apple, Open Library, YouTube, TMDB).
  add column cover_url text check (
    cover_url is null
    or cover_url ~ '^https://(is[0-9]+-ssl\.mzstatic\.com|covers\.openlibrary\.org|i\.ytimg\.com|image\.tmdb\.org)/'
  ),
  -- Apple's official 30-second song preview.
  add column preview_url text check (
    preview_url is null or preview_url ~ '^https://audio-ssl\.itunes\.apple\.com/'
  ),
  -- The part of a YouTube video a scene plays on the TV, in seconds.
  add column clip_start integer check (clip_start is null or clip_start between 0 and 86400),
  add column clip_end integer check (clip_end is null or (clip_end > coalesce(clip_start, 0) and clip_end <= 86400));

-- Bookshelves fill up faster than walls.
create or replace function public.enforce_piece_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.pieces where owner_id = new.owner_id) >= 80 then
    raise exception 'A room holds 80 pieces. Take one down to make space.';
  end if;
  return new;
end $$;
