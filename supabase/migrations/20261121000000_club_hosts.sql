-- Clubs: hand a club to another member, delete a club, and leave one.
-- Run this in the Supabase SQL editor. It is safe to run again.

-- The host makes another member the host (for example, the organiser after Bottega set the club up).
-- The old host stays in the club as a member. Guests (no email yet) can't be made host.
create or replace function public.make_club_host(p_club uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.clubs where id = p_club and host = auth.uid()) then
    raise exception 'Only the host can do that.';
  end if;
  if p_user = auth.uid() then return; end if;
  if not public.is_club_member(p_club, p_user) then raise exception 'They need to join the club first.'; end if;
  if exists (select 1 from auth.users where id = p_user and is_anonymous) then
    raise exception 'They need to add their email before they can host.';
  end if;
  if (select count(*) from public.clubs where host = p_user) >= 5 then
    raise exception 'They already host 5 clubs.';
  end if;
  update public.clubs set host = p_user where id = p_club;
end $$;
revoke execute on function public.make_club_host(uuid, uuid) from public, anon;
grant execute on function public.make_club_host(uuid, uuid) to authenticated;

-- The host deletes the club: members, shelf, votes, quiz scores and its chat all go with it.
create or replace function public.delete_club(p_club uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_slug text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select slug into v_slug from public.clubs where id = p_club and host = auth.uid();
  if v_slug is null then raise exception 'Only the host can do that.'; end if;
  delete from public.chat_messages where room_key = 'club:' || v_slug;
  delete from public.clubs where id = p_club; -- members, shelf, polls, votes and quiz scores cascade
end $$;
revoke execute on function public.delete_club(uuid) from public, anon;
grant execute on function public.delete_club(uuid) to authenticated;

-- Members can leave; the host can't simply walk out (hand the club over or delete it first).
drop policy if exists "host can't leave" on public.club_members;
create policy "host can't leave" on public.club_members
  as restrictive for delete to authenticated
  using (not exists (select 1 from public.clubs c where c.id = club_id and c.host = user_id));
