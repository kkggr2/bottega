-- Bottega: one email a day, only on days a friend put something on.
-- People can turn it off in the library or from any email.
-- Run this in the Supabase SQL editor. It is safe to run again.

create table if not exists public.email_prefs (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  digest          boolean not null default true,
  last_digest_at  timestamptz
);

alter table public.email_prefs enable row level security;

drop policy if exists "own email prefs read" on public.email_prefs;
create policy "own email prefs read" on public.email_prefs
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "own email prefs insert" on public.email_prefs;
create policy "own email prefs insert" on public.email_prefs
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own email prefs update" on public.email_prefs;
create policy "own email prefs update" on public.email_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.email_prefs from anon, authenticated;
grant select on public.email_prefs to authenticated;
grant insert (user_id, digest), update (user_id, digest) on public.email_prefs to authenticated;

-- Who gets an email today, and what their friends put on since their last one (at most a day back).
-- Only the server's secret key can call this: it reads email addresses.
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
  changes as (
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
  )
  select r.id, r.email, r.username::text,
         jsonb_agg(jsonb_build_object('friend', c.friend, 'slot', c.slot, 'title', c.title, 'at', c.at) order by c.at desc)
  from recipients r
  join changes c on c.recipient = r.id
  group by r.id, r.email, r.username;
$$;

-- Remember when each person was last emailed, so nothing is sent twice.
create or replace function public.mark_digest_sent(p_users uuid[])
returns void
language sql security definer set search_path = public as $$
  insert into public.email_prefs (user_id, last_digest_at)
  select unnest(p_users), now()
  on conflict (user_id) do update set last_digest_at = excluded.last_digest_at;
$$;

-- Turn the email off from the link in an email (the server checks the link first).
create or replace function public.stop_digest(p_user uuid)
returns void
language sql security definer set search_path = public as $$
  insert into public.email_prefs (user_id, digest) values (p_user, false)
  on conflict (user_id) do update set digest = false;
$$;

revoke execute on function public.digest_batch(), public.mark_digest_sent(uuid[]), public.stop_digest(uuid)
  from public, anon, authenticated;
grant execute on function public.digest_batch(), public.mark_digest_sent(uuid[]), public.stop_digest(uuid)
  to service_role;
