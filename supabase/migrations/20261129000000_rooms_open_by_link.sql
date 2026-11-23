-- New rooms open to anyone with the link, so a shared room never leaves a friend standing at a closed door.
-- Only the default changes: rooms that already exist keep the setting their owner has. Owners can still choose
-- "Friends" or "Just me" in Customize room → Who can come in.
-- Run this in the Supabase SQL editor. It is safe to run again.
alter table public.rooms alter column visibility set default 'public';
