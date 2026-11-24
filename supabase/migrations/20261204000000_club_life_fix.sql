-- Fix: answering a meeting and saying where you are in the book are saved as "insert, or update if it's
-- already there", which needs update rights on every column it writes. Still only your own row, and only
-- in clubs you're in.
-- Run this in the Supabase SQL editor after 20261203000000_club_life.sql. It is safe to run again.

grant update (meeting_id, user_id, answer, updated_at) on public.club_rsvps to authenticated;
drop policy if exists "change own rsvp" on public.club_rsvps;
create policy "change own rsvp" on public.club_rsvps
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_club_member(public.meeting_club(meeting_id), auth.uid()));

grant update (reading_id, user_id, part, updated_at) on public.club_progress to authenticated;
drop policy if exists "change own progress" on public.club_progress;
create policy "change own progress" on public.club_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_club_member(public.reading_club(reading_id), auth.uid()));
