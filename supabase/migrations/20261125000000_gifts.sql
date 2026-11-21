-- Wrapped gifts: a recommendation can be left wrapped. The friend sees a parcel by their door and unwraps it
-- themselves; until then the push, the Library and the daily email only say "something wrapped".
-- The giver hears when it's opened. Run this in the Supabase SQL editor. It is safe to run again.

alter table public.recommendations add column if not exists wrapped boolean not null default false;
alter table public.recommendations add column if not exists opened_at timestamptz;

-- The giver chooses to wrap it; only the person it's for can open it (their update policy already covers that).
grant insert (wrapped) on public.recommendations to authenticated;
grant update (opened_at) on public.recommendations to authenticated;

create index if not exists recommendations_from_opened on public.recommendations (from_user, opened_at desc) where opened_at is not null;

-- The daily email keeps the surprise.
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
    select r.id as recipient, fp.username as friend, 'rec'::text as slot, rc.created_at as at,
           case when rc.wrapped and rc.opened_at is null then 'something wrapped' else rc.title end as title
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
