-- The invitation page says where and when a club meets, for clubs whose hosts chose to be found
-- (someone arriving from "A club that shares your taste" wants to know that before joining).
-- Clubs that stay link-only show nothing new. Readable by anyone with the link, like the rest of the invitation.
-- Run this in the Supabase SQL editor after 20261209000000_club_discovery.sql. It is safe to run again.

create or replace function public.club_meets(p_slug text)
returns table (meets_in text, meets_online boolean, meets_when text)
language sql stable security definer set search_path = public as $$
  select c.meets_in, c.meets_online, c.meets_when
  from public.clubs c
  where c.slug = lower(p_slug) and c.discoverable;
$$;
revoke execute on function public.club_meets(text) from public;
grant execute on function public.club_meets(text) to anon, authenticated;
