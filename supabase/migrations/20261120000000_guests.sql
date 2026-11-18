-- Guests: someone who taps a club link can join and play straight away, with just a name.
-- They are Supabase "anonymous" users (a real account with no email yet). Until they add an email,
-- guests can join clubs, vote, play quizzes and fill their own room, but they can't write to other
-- people (chats, letters, notes, recommendations, friend requests) or start clubs. That keeps every
-- message tied to an account that can be reached, for reports and moderation.
--
-- Before running this: Supabase dashboard → Authentication → Sign In / Providers →
-- turn on "Allow anonymous sign-ins".

create or replace function public.is_guest() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;
grant execute on function public.is_guest() to authenticated;

-- Restrictive policies: they apply on top of the existing ones (both must pass).
drop policy if exists "guests can't chat" on public.chat_messages;
create policy "guests can't chat" on public.chat_messages
  as restrictive for insert to authenticated with check (not public.is_guest());

drop policy if exists "guests can't write letters" on public.direct_messages;
create policy "guests can't write letters" on public.direct_messages
  as restrictive for insert to authenticated with check (not public.is_guest());

drop policy if exists "guests can't leave notes" on public.notes;
create policy "guests can't leave notes" on public.notes
  as restrictive for insert to authenticated with check (not public.is_guest());

drop policy if exists "guests can't recommend" on public.recommendations;
create policy "guests can't recommend" on public.recommendations
  as restrictive for insert to authenticated with check (not public.is_guest());

-- Friend requests a guest starts. (Joining a club still connects them with its host:
-- join_club runs as the database owner, which policies don't apply to.)
drop policy if exists "guests can't send friend requests" on public.friendships;
create policy "guests can't send friend requests" on public.friendships
  as restrictive for insert to authenticated with check (not public.is_guest());

-- Starting a club goes through create_club (owner rights), so check it with a trigger instead.
create or replace function public.no_guest_clubs() returns trigger
language plpgsql as $$
begin
  if public.is_guest() then
    raise exception 'Add your email to start a club.';
  end if;
  return new;
end $$;
drop trigger if exists no_guest_clubs on public.clubs;
create trigger no_guest_clubs before insert on public.clubs
  for each row execute function public.no_guest_clubs();
