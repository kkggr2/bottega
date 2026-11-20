-- Taste Twins: people anywhere in the world whose rooms are most like yours. Opt-in, both ways:
-- only people who switched it on are shown, and only to others who switched it on too.
-- What's shared with them: your username and what's in your room (titles, makers, covers), never your notes,
-- your messages or anything else. Your room itself stays as private as you set it; a twin who wants in
-- sends a friend request ("swap keys") like anyone else.
-- Run this in the Supabase SQL editor. It is safe to run again.

create table if not exists public.twin_optin (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  opted_at   timestamptz not null default now()
);
alter table public.twin_optin enable row level security;
drop policy if exists "own twin opt-in" on public.twin_optin;
create policy "own twin opt-in" on public.twin_optin
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and not public.is_guest());
revoke all on public.twin_optin from anon, authenticated;
grant select, insert, delete on public.twin_optin to authenticated;
grant all on public.twin_optin to service_role;

-- Everyone else who opted in, with what's in their room, for the app to match against.
-- Only for people who opted in themselves. Leaves out friends (already connected), blocked people and rooms with
-- fewer than three things. The most recently active 400 people, up to 60 pieces each.
create or replace function public.twin_candidates()
returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
       people as (
         select o.user_id, p.username::text as username,
                (select max(x.created_at) from public.pieces x where x.owner_id = o.user_id) as active
         from public.twin_optin o
         join public.profiles p on p.id = o.user_id, me
         where o.user_id <> me.id
           and not public.is_blocked(me.id, o.user_id)
           and not public.are_friends(me.id, o.user_id)
           and (select count(*) from public.pieces x where x.owner_id = o.user_id) >= 3
         order by active desc nulls last
         limit 400
       )
  select case
    when (select id from me) is null then null
    when not exists (select 1 from public.twin_optin o, me where o.user_id = me.id) then null
    else coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', pe.user_id,
        'username', pe.username,
        'pieces', (select coalesce(jsonb_agg(jsonb_build_object(
                     'id', x.id, 'type', x.type, 'title', x.title, 'subtitle', x.subtitle, 'cover_url', x.cover_url)), '[]'::jsonb)
                   from (select * from public.pieces where owner_id = pe.user_id order by created_at desc limit 60) x)
      ))
      from people pe
    ), '[]'::jsonb)
  end;
$$;
revoke execute on function public.twin_candidates() from public, anon;
grant execute on function public.twin_candidates() to authenticated;
