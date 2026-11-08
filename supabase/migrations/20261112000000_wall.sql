-- Bottega: the guestbook (notes on a room's wall), "this one got me" reactions, and recommendations
-- left at a friend's door. Run this in the Supabase SQL editor. It is safe to run again.

-- ---------------------------------------------------------------------------
-- Guestbook: friends leave notes on your wall. You can delete any note on your wall;
-- authors can delete their own. Blocked people can't post (they can't see the room).
-- ---------------------------------------------------------------------------

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  room_owner  uuid not null references public.profiles (id) on delete cascade,
  author      uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists notes_room on public.notes (room_owner, created_at desc);
alter table public.notes enable row level security;

drop policy if exists "notes readable with the room" on public.notes;
create policy "notes readable with the room" on public.notes
  for select to authenticated using (public.can_view_room(room_owner));
drop policy if exists "friends leave notes" on public.notes;
create policy "friends leave notes" on public.notes
  for insert to authenticated
  with check (author = auth.uid()
              and (room_owner = auth.uid() or public.are_friends(room_owner, auth.uid()))
              and not public.is_blocked(room_owner, auth.uid()));
drop policy if exists "notes removable" on public.notes;
create policy "notes removable" on public.notes
  for delete to authenticated using (author = auth.uid() or room_owner = auth.uid());

revoke all on public.notes from anon, authenticated;
grant select, delete on public.notes to authenticated;
grant insert (room_owner, author, body) on public.notes to authenticated;

-- No more than 20 notes an hour from one person.
create or replace function public.limit_notes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.notes where author = new.author and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'That''s a lot of notes. Try again in a bit.';
  end if;
  return new;
end $$;
drop trigger if exists notes_limit on public.notes;
create trigger notes_limit before insert on public.notes for each row execute function public.limit_notes();

-- ---------------------------------------------------------------------------
-- Reactions: "this one got me" on a piece. Only the piece's owner (and the person who reacted)
-- can see them: no public counts.
-- ---------------------------------------------------------------------------

create table if not exists public.reactions (
  piece_id    uuid not null references public.pieces (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (piece_id, user_id)
);
alter table public.reactions enable row level security;

drop policy if exists "reactions seen by owner and reactor" on public.reactions;
create policy "reactions seen by owner and reactor" on public.reactions
  for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.pieces p where p.id = piece_id and p.owner_id = auth.uid()));
drop policy if exists "react to others' pieces" on public.reactions;
create policy "react to others' pieces" on public.reactions
  for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.pieces p
                          where p.id = piece_id and p.owner_id <> auth.uid() and public.can_view_room(p.owner_id)));
drop policy if exists "take back a reaction" on public.reactions;
create policy "take back a reaction" on public.reactions
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.reactions from anon, authenticated;
grant select, delete on public.reactions to authenticated;
grant insert (piece_id, user_id) on public.reactions to authenticated;

-- ---------------------------------------------------------------------------
-- Recommendations: a friend leaves a song, film or book at your door with a note.
-- You hang it in your room or pass on it.
-- ---------------------------------------------------------------------------

create table if not exists public.recommendations (
  id           uuid primary key default gen_random_uuid(),
  to_user      uuid not null references public.profiles (id) on delete cascade,
  from_user    uuid not null references public.profiles (id) on delete cascade,
  type         text not null check (type in ('song', 'poster', 'scene', 'book')),
  title        text not null check (char_length(title) between 1 and 80),
  subtitle     text not null default '' check (char_length(subtitle) <= 80),
  cover_url    text check (cover_url is null
                 or cover_url ~ '^https://(is[0-9]+-ssl\.mzstatic\.com|covers\.openlibrary\.org|i\.ytimg\.com|image\.tmdb\.org)/'),
  preview_url  text check (preview_url is null or preview_url ~ '^https://audio-ssl\.itunes\.apple\.com/'),
  link         text check (link is null or (link ~ '^https://\S+$' and char_length(link) between 11 and 500)),
  note         text not null default '' check (char_length(note) <= 280),
  status       text not null default 'new' check (status in ('new', 'kept', 'passed')),
  created_at   timestamptz not null default now(),
  check (to_user <> from_user)
);
create index if not exists recommendations_to on public.recommendations (to_user, created_at desc);
alter table public.recommendations enable row level security;

drop policy if exists "recommendations between the two" on public.recommendations;
create policy "recommendations between the two" on public.recommendations
  for select to authenticated using (to_user = auth.uid() or from_user = auth.uid());
drop policy if exists "friends recommend" on public.recommendations;
create policy "friends recommend" on public.recommendations
  for insert to authenticated
  with check (from_user = auth.uid() and status = 'new' and public.are_friends(to_user, auth.uid()));
drop policy if exists "keep or pass" on public.recommendations;
create policy "keep or pass" on public.recommendations
  for update to authenticated using (to_user = auth.uid()) with check (to_user = auth.uid());
drop policy if exists "recommendations removable" on public.recommendations;
create policy "recommendations removable" on public.recommendations
  for delete to authenticated using (to_user = auth.uid() or from_user = auth.uid());

revoke all on public.recommendations from anon, authenticated;
grant select, delete on public.recommendations to authenticated;
grant insert (to_user, from_user, type, title, subtitle, cover_url, preview_url, link, note) on public.recommendations to authenticated;
grant update (status) on public.recommendations to authenticated;

-- Notes and recommendations show up live.
do $$ begin
  alter publication supabase_realtime add table public.notes, public.recommendations;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- The daily email also mentions notes on your wall and recommendations at your door.
-- ---------------------------------------------------------------------------

create or replace function public.digest_batch()
returns table (user_id uuid, email text, username text, items jsonb)
language sql stable security definer set search_path = public as $$
  with recipients as (
    select p.id, p.username, u.email::text as email,
           greatest(coalesce(ep.last_digest_at, now() - interval '1 day'), now() - interval '1 day') as since
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.email_prefs ep on ep.user_id = p.id
    where coalesce(ep.digest, true) and u.email is not null
  ),
  now_changes as (
    select r.id as recipient, fp.username as friend, s.slot, s.at, pc.title
    from recipients r
    join public.friendships f on f.status = 'accepted' and r.id in (f.requester, f.addressee)
    join public.rooms rm on rm.owner_id = case when f.requester = r.id then f.addressee else f.requester end
    join public.profiles fp on fp.id = rm.owner_id
    cross join lateral (values
      ('song', rm.now_song, rm.now_song_at),
      ('film', rm.now_film, rm.now_film_at),
      ('book', rm.now_book, rm.now_book_at)) as s (slot, piece_id, at)
    join public.pieces pc on pc.id = s.piece_id
    where s.at > r.since and rm.visibility <> 'private'
  ),
  wall_notes as (
    select r.id as recipient, ap.username as friend, 'note'::text as slot, n.created_at as at, left(n.body, 80) as title
    from recipients r
    join public.notes n on n.room_owner = r.id and n.author <> r.id and n.created_at > r.since
    join public.profiles ap on ap.id = n.author
  ),
  recs as (
    select r.id as recipient, fp.username as friend, 'rec'::text as slot, rc.created_at as at, rc.title
    from recipients r
    join public.recommendations rc on rc.to_user = r.id and rc.status = 'new' and rc.created_at > r.since
    join public.profiles fp on fp.id = rc.from_user
  ),
  everything as (
    select * from now_changes union all select * from wall_notes union all select * from recs
  )
  select r.id, r.email, r.username::text,
         jsonb_agg(jsonb_build_object('friend', e.friend, 'slot', e.slot, 'title', e.title, 'at', e.at) order by e.at desc)
  from recipients r
  join everything e on e.recipient = r.id
  group by r.id, r.email, r.username;
$$;
revoke execute on function public.digest_batch() from public, anon, authenticated;
grant execute on function public.digest_batch() to service_role;
