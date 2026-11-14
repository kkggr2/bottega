-- Bottega: live chat rooms by taste, and private messages.
-- Run this in the Supabase SQL editor. It is safe to run again.
--
-- A chat room belongs to an artist, director or author ("Neil Young tonight"). You can be in it
-- while something of theirs is on your turntable, in your TV or on your armchair. Messages last
-- 24 hours. From a chat you can swap keys (send a friend request) or write privately.
-- Private messages: friends write freely; anyone else gets one message (a request) until they reply.
-- Everything passes a word filter and a speed limit; any message can be reported or its author blocked.

-- ---------------------------------------------------------------------------
-- Which room a piece belongs to: its kind and its artist / director / author.
-- ---------------------------------------------------------------------------

create or replace function public.chat_slot(p_type text) returns text
language sql immutable as $$
  select case p_type when 'song' then 'song' when 'scene' then 'film' when 'poster' then 'film' when 'book' then 'book' end;
$$;

-- The subtitle is "Artist · year" (or "Director · year", "Author · year"). Without a name, the title stands in.
create or replace function public.chat_creator(p_title text, p_subtitle text) returns text
language sql immutable as $$
  select case
    when btrim(split_part(coalesce(p_subtitle, ''), ' · ', 1)) ~* '^(|[0-9]{4}|tv series)$' then btrim(p_title)
    else btrim(split_part(p_subtitle, ' · ', 1))
  end;
$$;

create or replace function public.chat_key(p_type text, p_title text, p_subtitle text) returns text
language sql immutable as $$
  select public.chat_slot(p_type) || ':' || lower(public.chat_creator(p_title, p_subtitle));
$$;

-- What's on in each room right now, one row per slot, with its chat room.
create or replace function public.now_on()
returns table (owner_id uuid, slot text, piece_id uuid, title text, subtitle text, cover_url text, chat_key text, creator text)
language sql stable security definer set search_path = public as $$
  select r.owner_id, public.chat_slot(p.type), p.id, p.title, p.subtitle, p.cover_url,
         public.chat_key(p.type, p.title, p.subtitle), public.chat_creator(p.title, p.subtitle)
  from public.rooms r
  join public.pieces p on p.id in (r.now_song, r.now_film, r.now_book) and p.owner_id = r.owner_id;
$$;
revoke execute on function public.now_on() from public, anon, authenticated;

-- The rooms I can be in right now.
create or replace function public.my_chat_keys() returns setof text
language sql stable security definer set search_path = public as $$
  select chat_key from public.now_on() where owner_id = auth.uid();
$$;
revoke execute on function public.my_chat_keys() from public, anon;
grant execute on function public.my_chat_keys() to authenticated;

-- ---------------------------------------------------------------------------
-- The word filter: slurs and the worst insults, in English and Turkish.
-- Matching is on whole words, ignoring case and common letter swaps.
-- ---------------------------------------------------------------------------

create or replace function public.is_offensive(p_text text) returns boolean
language sql immutable as $$
  select regexp_replace(lower(translate(coalesce(p_text, ''), '013457@$!ıİ', 'oieastasiii')), '[^a-zçğöşü ]', '', 'g') ~
    ('(^| )(' ||
     'nigg(a|er|ers|as|uh)|n[i1]gg|faggots?|fags?|dykes?|trann(y|ies)|retards?|retarded|kikes?|spics?|chinks?|wetbacks?|coons?|' ||
     'cunts?|whores?|sluts?|kill yourself|kys|' ||
     'orospu|orospu cocugu|piç|pic kurusu|amına|amina|amk|aq|siktir|sikerim|yavsak|yavşak|ibne|gotveren|götveren|kahpe|serefsiz|şerefsiz' ||
     ')( |$)');
$$;

-- ---------------------------------------------------------------------------
-- Chat messages
-- ---------------------------------------------------------------------------

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  room_key    text not null check (char_length(room_key) between 3 and 200),
  author      uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_room on public.chat_messages (room_key, created_at desc);
alter table public.chat_messages enable row level security;

drop policy if exists "chat readable by people in the room" on public.chat_messages;
create policy "chat readable by people in the room" on public.chat_messages
  for select to authenticated
  using (created_at > now() - interval '24 hours'
         and room_key in (select public.my_chat_keys())
         and not public.is_blocked(author, auth.uid()));
drop policy if exists "chat writable by people in the room" on public.chat_messages;
create policy "chat writable by people in the room" on public.chat_messages
  for insert to authenticated
  with check (author = auth.uid() and room_key in (select public.my_chat_keys()));
drop policy if exists "own chat messages removable" on public.chat_messages;
create policy "own chat messages removable" on public.chat_messages
  for delete to authenticated using (author = auth.uid());

revoke all on public.chat_messages from anon, authenticated;
grant select, delete on public.chat_messages to authenticated;
grant insert (room_key, author, body) on public.chat_messages to authenticated;
grant select, insert, update, delete on public.chat_messages to service_role;

create or replace function public.check_chat_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_offensive(new.body) then
    raise exception 'Keep it kind: that message has words Bottega doesn''t allow.';
  end if;
  if (select count(*) from public.chat_messages where author = new.author and created_at > now() - interval '1 minute') >= 12 then
    raise exception 'Slow down a little: too many messages in a minute.';
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists chat_messages_check on public.chat_messages;
create trigger chat_messages_check before insert on public.chat_messages
  for each row execute function public.check_chat_message();

-- Tonight's rooms for me: one per thing I have on, with who else is in it and how lively it is.
create or replace function public.my_chat_rooms()
returns table (room_key text, slot text, creator text, my_title text, people int, messages int, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  with mine as (select * from public.now_on() where owner_id = auth.uid())
  select m.chat_key, m.slot, m.creator, m.title,
         (select count(distinct n.owner_id)::int from public.now_on() n
            where n.chat_key = m.chat_key and not public.is_blocked(n.owner_id, auth.uid())),
         (select count(*)::int from public.chat_messages c
            where c.room_key = m.chat_key and c.created_at > now() - interval '24 hours'),
         (select max(c.created_at) from public.chat_messages c
            where c.room_key = m.chat_key and c.created_at > now() - interval '24 hours')
  from mine m;
$$;
revoke execute on function public.my_chat_rooms() from public, anon;
grant execute on function public.my_chat_rooms() to authenticated;

-- Who's in a room (only for people in it): username and what they have on.
create or replace function public.chat_members(p_key text)
returns table (user_id uuid, username text, title text, subtitle text, cover_url text)
language sql stable security definer set search_path = public as $$
  select n.owner_id, pr.username::text, n.title, n.subtitle, n.cover_url
  from public.now_on() n
  join public.profiles pr on pr.id = n.owner_id
  where n.chat_key = p_key
    and p_key in (select public.my_chat_keys())
    and not public.is_blocked(n.owner_id, auth.uid())
  order by pr.username;
$$;
revoke execute on function public.chat_members(text) from public, anon;
grant execute on function public.chat_members(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Private messages
-- ---------------------------------------------------------------------------

create table if not exists public.direct_messages (
  id          uuid primary key default gen_random_uuid(),
  sender      uuid not null references public.profiles (id) on delete cascade,
  recipient   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  check (sender <> recipient)
);
create index if not exists direct_messages_pair on public.direct_messages (sender, recipient, created_at desc);
create index if not exists direct_messages_inbox on public.direct_messages (recipient, created_at desc);
alter table public.direct_messages enable row level security;

-- Friends write freely. Anyone else: one message as a request, then more once they've replied.
create or replace function public.can_message(p_from uuid, p_to uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_from <> p_to
     and not public.is_blocked(p_from, p_to)
     and (public.are_friends(p_from, p_to)
          or exists (select 1 from public.direct_messages where sender = p_to and recipient = p_from)
          or not exists (select 1 from public.direct_messages where sender = p_from and recipient = p_to));
$$;
revoke execute on function public.can_message(uuid, uuid) from public, anon;
grant execute on function public.can_message(uuid, uuid) to authenticated;

drop policy if exists "messages between the two" on public.direct_messages;
create policy "messages between the two" on public.direct_messages
  for select to authenticated
  using ((sender = auth.uid() or recipient = auth.uid()) and not public.is_blocked(sender, recipient));
drop policy if exists "send a message" on public.direct_messages;
create policy "send a message" on public.direct_messages
  for insert to authenticated
  with check (sender = auth.uid() and public.can_message(sender, recipient));
drop policy if exists "mark as read" on public.direct_messages;
create policy "mark as read" on public.direct_messages
  for update to authenticated using (recipient = auth.uid()) with check (recipient = auth.uid());
drop policy if exists "unsend" on public.direct_messages;
create policy "unsend" on public.direct_messages
  for delete to authenticated using (sender = auth.uid());

revoke all on public.direct_messages from anon, authenticated;
grant select, delete on public.direct_messages to authenticated;
grant insert (sender, recipient, body) on public.direct_messages to authenticated;
grant update (read_at) on public.direct_messages to authenticated;
grant select, insert, update, delete on public.direct_messages to service_role;

create or replace function public.check_direct_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_offensive(new.body) then
    raise exception 'Keep it kind: that message has words Bottega doesn''t allow.';
  end if;
  if (select count(*) from public.direct_messages where sender = new.sender and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Slow down a little: too many messages in a minute.';
  end if;
  new.created_at := now();
  new.read_at := null;
  return new;
end $$;
drop trigger if exists direct_messages_check on public.direct_messages;
create trigger direct_messages_check before insert on public.direct_messages
  for each row execute function public.check_direct_message();

-- My conversations, newest first: who, the last message, how many unread, and whether it's a request.
create or replace function public.my_threads()
returns table (other_id uuid, username text, last_body text, last_at timestamptz, last_from_me boolean, unread int, is_request boolean, is_friend boolean)
language sql stable security definer set search_path = public as $$
  with mine as (
    select case when sender = auth.uid() then recipient else sender end as other, *
    from public.direct_messages
    where (sender = auth.uid() or recipient = auth.uid()) and not public.is_blocked(sender, recipient)
  ),
  latest as (select distinct on (other) * from mine order by other, created_at desc)
  select l.other, p.username::text, l.body, l.created_at, l.sender = auth.uid(),
         (select count(*)::int from mine m where m.other = l.other and m.recipient = auth.uid() and m.read_at is null),
         -- A request: they wrote, I never have, and we're not friends.
         not public.are_friends(auth.uid(), l.other)
           and not exists (select 1 from mine m where m.other = l.other and m.sender = auth.uid()),
         public.are_friends(auth.uid(), l.other)
  from latest l join public.profiles p on p.id = l.other
  order by l.created_at desc;
$$;
revoke execute on function public.my_threads() from public, anon;
grant execute on function public.my_threads() to authenticated;

-- Live updates for both.
do $$ begin
  alter publication supabase_realtime add table public.chat_messages, public.direct_messages;
exception when duplicate_object then null;
end $$;

-- Chat messages older than two days are deleted for good (the daily cron calls this).
create or replace function public.purge_chat() returns int
language sql security definer set search_path = public as $$
  with gone as (delete from public.chat_messages where created_at < now() - interval '48 hours' returning 1)
  select count(*)::int from gone;
$$;
revoke execute on function public.purge_chat() from public, anon, authenticated;
grant execute on function public.purge_chat() to service_role;

-- ---------------------------------------------------------------------------
-- Reports can point at a message. The text is copied, since chat messages are deleted after two days.
-- ---------------------------------------------------------------------------

alter table public.reports add column if not exists message_kind text check (message_kind in ('chat', 'dm'));
alter table public.reports add column if not exists message_id uuid;
alter table public.reports add column if not exists message_body text;

-- Growth events.
alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'open', 'landing', 'example', 'room_view', 'make_yours',
  'account_created', 'room_claimed', 'piece_added', 'import',
  'share_link', 'share_picture', 'friend_request', 'made_public', 'now_set',
  'quiz_start', 'quiz_done', 'chat_open', 'chat_send', 'dm_send'));
