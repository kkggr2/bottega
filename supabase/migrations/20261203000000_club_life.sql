-- Clubs that can replace the WhatsApp group: what we're reading (with chapter notes nobody gets spoiled by),
-- when we meet (and who's coming), and a nudge when something happens. Also notifications in browsers.
-- Run this in the Supabase SQL editor after 20261202000000_club_admin.sql. It is safe to run again.

-- ---------------------------------------------------------------------------
-- Notifications in browsers (Web Push), next to the iPhone app's
-- ---------------------------------------------------------------------------

alter table public.push_tokens drop constraint if exists push_tokens_token_check;
alter table public.push_tokens add constraint push_tokens_token_check check (char_length(token) between 20 and 1000);
alter table public.push_tokens drop constraint if exists push_tokens_platform_check;
alter table public.push_tokens add constraint push_tokens_platform_check check (platform in ('ios', 'android', 'web'));
alter table public.push_tokens add column if not exists p256dh text check (p256dh is null or char_length(p256dh) <= 200);
alter table public.push_tokens add column if not exists auth text check (auth is null or char_length(auth) <= 100);
grant insert (token, user_id, platform, updated_at, p256dh, auth), update (token, user_id, platform, updated_at, p256dh, auth)
  on public.push_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- Muting a club, and who to tell when something happens in it
-- ---------------------------------------------------------------------------

alter table public.club_members add column if not exists muted boolean not null default false;

create or replace function public.set_club_muted(p_club uuid, p_on boolean)
returns void
language sql security definer set search_path = public as $$
  update public.club_members set muted = p_on where club_id = p_club and user_id = auth.uid();
$$;
revoke execute on function public.set_club_muted(uuid, boolean) from public, anon;
grant execute on function public.set_club_muted(uuid, boolean) to authenticated;

create or replace function public.club_muted(p_club uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select muted from public.club_members where club_id = p_club and user_id = auth.uid()), false);
$$;
revoke execute on function public.club_muted(uuid) from public, anon;
grant execute on function public.club_muted(uuid) to authenticated;

-- When each member was last told about each kind of thing in a club (chat messages are bundled).
create table if not exists public.club_push_log (
  club_id  uuid not null references public.clubs (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  kind     text not null check (kind in ('message', 'poll', 'meeting', 'reading')),
  sent_at  timestamptz not null default now(),
  primary key (club_id, user_id, kind)
);
alter table public.club_push_log enable row level security;
revoke all on public.club_push_log from anon, authenticated;

-- The server's list: members to tell (not the sender, not muted, not blocked either way, not told about
-- this kind within p_quiet). Service role only.
create or replace function public.club_notify_targets(p_club uuid, p_sender uuid, p_kind text, p_quiet interval)
returns table (user_id uuid)
language sql stable security definer set search_path = public as $$
  select m.user_id
  from public.club_members m
  left join public.club_push_log l on l.club_id = m.club_id and l.user_id = m.user_id and l.kind = p_kind
  where m.club_id = p_club and m.user_id <> p_sender and not m.muted
    and not public.is_blocked(m.user_id, p_sender)
    and (l.sent_at is null or l.sent_at < now() - p_quiet);
$$;

create or replace function public.log_club_push(p_club uuid, p_kind text, p_users uuid[])
returns void
language sql security definer set search_path = public as $$
  insert into public.club_push_log (club_id, user_id, kind, sent_at)
  select p_club, unnest(p_users), p_kind, now()
  on conflict (club_id, user_id, kind) do update set sent_at = excluded.sent_at;
$$;

revoke execute on function public.club_notify_targets(uuid, uuid, text, interval), public.log_club_push(uuid, text, uuid[])
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Meetings, and who's coming
-- ---------------------------------------------------------------------------

create table if not exists public.club_meetings (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs (id) on delete cascade,
  starts_at    timestamptz not null,
  place        text not null default '' check (char_length(place) <= 200),
  link         text check (link is null or (link ~ '^https://\S+$' and char_length(link) <= 500)),
  note         text not null default '' check (char_length(note) <= 500),
  tz           text not null default 'UTC' check (char_length(tz) between 1 and 60), -- the host's time zone, for reminders
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  reminded_at  timestamptz
);
create index if not exists club_meetings_club on public.club_meetings (club_id, starts_at);
alter table public.club_meetings add column if not exists tz text not null default 'UTC' check (char_length(tz) between 1 and 60);
alter table public.club_meetings enable row level security;

drop policy if exists "meetings seen by members" on public.club_meetings;
create policy "meetings seen by members" on public.club_meetings
  for select to authenticated using (public.is_club_member(club_id, auth.uid()));
drop policy if exists "hosts plan meetings" on public.club_meetings;
create policy "hosts plan meetings" on public.club_meetings
  for insert to authenticated with check (created_by = auth.uid() and public.is_club_host(club_id, auth.uid()));
drop policy if exists "hosts change meetings" on public.club_meetings;
create policy "hosts change meetings" on public.club_meetings
  for update to authenticated using (public.is_club_host(club_id, auth.uid())) with check (public.is_club_host(club_id, auth.uid()));
drop policy if exists "hosts cancel meetings" on public.club_meetings;
create policy "hosts cancel meetings" on public.club_meetings
  for delete to authenticated using (public.is_club_host(club_id, auth.uid()));

revoke all on public.club_meetings from anon, authenticated;
grant select, delete on public.club_meetings to authenticated;
grant insert (club_id, starts_at, place, link, note, tz, created_by) on public.club_meetings to authenticated;
grant update (starts_at, place, link, note, tz) on public.club_meetings to authenticated;
grant all on public.club_meetings to service_role;

-- Moving a meeting means everyone should be reminded again.
create or replace function public.meeting_moved() returns trigger
language plpgsql as $$
begin
  if new.starts_at is distinct from old.starts_at then new.reminded_at := null; end if;
  return new;
end $$;
drop trigger if exists club_meetings_moved on public.club_meetings;
create trigger club_meetings_moved before update on public.club_meetings
  for each row execute function public.meeting_moved();

create table if not exists public.club_rsvps (
  meeting_id  uuid not null references public.club_meetings (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  answer      text not null check (answer in ('yes', 'maybe', 'no')),
  updated_at  timestamptz not null default now(),
  primary key (meeting_id, user_id)
);
alter table public.club_rsvps enable row level security;

create or replace function public.meeting_club(p_meeting uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select club_id from public.club_meetings where id = p_meeting;
$$;
revoke execute on function public.meeting_club(uuid) from public, anon;
grant execute on function public.meeting_club(uuid) to authenticated;

drop policy if exists "rsvps seen by members" on public.club_rsvps;
create policy "rsvps seen by members" on public.club_rsvps
  for select to authenticated using (public.is_club_member(public.meeting_club(meeting_id), auth.uid()));
drop policy if exists "own rsvp" on public.club_rsvps;
create policy "own rsvp" on public.club_rsvps
  for insert to authenticated with check (user_id = auth.uid() and public.is_club_member(public.meeting_club(meeting_id), auth.uid()));
drop policy if exists "change own rsvp" on public.club_rsvps;
create policy "change own rsvp" on public.club_rsvps
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.club_rsvps from anon, authenticated;
grant select on public.club_rsvps to authenticated;
grant insert (meeting_id, user_id, answer, updated_at), update (answer, updated_at) on public.club_rsvps to authenticated;
grant all on public.club_rsvps to service_role;

-- The next meeting (or one that started in the last 3 hours), with who's coming.
create or replace function public.club_next_meeting(p_club uuid)
returns table (id uuid, starts_at timestamptz, place text, link text, note text,
               going text[], maybe int, not_going int, my_answer text)
language sql stable security definer set search_path = public as $$
  select mt.id, mt.starts_at, mt.place, mt.link, mt.note,
         array(select p.username::text from public.club_rsvps r join public.profiles p on p.id = r.user_id
               where r.meeting_id = mt.id and r.answer = 'yes' order by r.updated_at),
         (select count(*)::int from public.club_rsvps r where r.meeting_id = mt.id and r.answer = 'maybe'),
         (select count(*)::int from public.club_rsvps r where r.meeting_id = mt.id and r.answer = 'no'),
         (select r.answer from public.club_rsvps r where r.meeting_id = mt.id and r.user_id = auth.uid())
  from public.club_meetings mt
  where mt.club_id = p_club and public.is_club_member(p_club, auth.uid())
    and mt.starts_at > now() - interval '3 hours'
  order by mt.starts_at
  limit 1;
$$;
revoke execute on function public.club_next_meeting(uuid) from public, anon;
grant execute on function public.club_next_meeting(uuid) to authenticated;

-- For the daily reminder: meetings in the next 12–36 hours not yet reminded, with whom to tell
-- (everyone except people who said no, or who muted the club). Marks them reminded. Service role only.
create or replace function public.due_meeting_reminders()
returns table (meeting_id uuid, club_id uuid, slug text, club_name text, starts_at timestamptz, place text, tz text, users uuid[])
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    update public.club_meetings mt set reminded_at = now()
    where mt.reminded_at is null and mt.starts_at between now() + interval '12 hours' and now() + interval '36 hours'
    returning mt.id, mt.club_id, mt.starts_at, mt.place, mt.tz
  )
  select d.id, d.club_id, c.slug, c.name, d.starts_at, d.place, d.tz,
         array(select m.user_id from public.club_members m
               where m.club_id = d.club_id and not m.muted
                 and not exists (select 1 from public.club_rsvps r where r.meeting_id = d.id and r.user_id = m.user_id and r.answer = 'no'))
  from due d join public.clubs c on c.id = d.club_id;
end $$;
revoke execute on function public.due_meeting_reminders() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What we're reading, how far everyone is, and notes nobody gets spoiled by
-- ---------------------------------------------------------------------------

create table if not exists public.club_readings (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 160),
  subtitle     text not null default '' check (char_length(subtitle) <= 160),
  cover_url    text check (cover_url is null
                 or cover_url ~ '^https://(is[0-9]+-ssl\.mzstatic\.com|covers\.openlibrary\.org|i\.ytimg\.com|image\.tmdb\.org)/'),
  link         text check (link is null or (link ~ '^https://\S+$' and char_length(link) <= 500)),
  parts        int not null default 10 check (parts between 1 and 200),
  part_word    text not null default 'chapter' check (part_word in ('chapter', 'part', 'section', 'episode')),
  due_on       date,
  started_by   uuid references public.profiles (id) on delete set null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create unique index if not exists club_readings_one_current on public.club_readings (club_id) where finished_at is null;
create index if not exists club_readings_club on public.club_readings (club_id, started_at desc);
alter table public.club_readings enable row level security;

drop policy if exists "readings seen by members" on public.club_readings;
create policy "readings seen by members" on public.club_readings
  for select to authenticated using (public.is_club_member(club_id, auth.uid()));
drop policy if exists "hosts start a reading" on public.club_readings;
create policy "hosts start a reading" on public.club_readings
  for insert to authenticated with check (started_by = auth.uid() and public.is_club_host(club_id, auth.uid()));
drop policy if exists "hosts change the reading" on public.club_readings;
create policy "hosts change the reading" on public.club_readings
  for update to authenticated using (public.is_club_host(club_id, auth.uid())) with check (public.is_club_host(club_id, auth.uid()));
drop policy if exists "hosts remove a reading" on public.club_readings;
create policy "hosts remove a reading" on public.club_readings
  for delete to authenticated using (public.is_club_host(club_id, auth.uid()));

revoke all on public.club_readings from anon, authenticated;
grant select, delete on public.club_readings to authenticated;
grant insert (club_id, title, subtitle, cover_url, link, parts, part_word, due_on, started_by) on public.club_readings to authenticated;
grant update (parts, part_word, due_on, finished_at) on public.club_readings to authenticated;
grant all on public.club_readings to service_role;

create or replace function public.reading_club(p_reading uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select club_id from public.club_readings where id = p_reading;
$$;
revoke execute on function public.reading_club(uuid) from public, anon;
grant execute on function public.reading_club(uuid) to authenticated;

-- How far each member has read: 0 = not started; = parts means finished.
create table if not exists public.club_progress (
  reading_id  uuid not null references public.club_readings (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  part        int not null check (part between 0 and 200),
  updated_at  timestamptz not null default now(),
  primary key (reading_id, user_id)
);
alter table public.club_progress enable row level security;

drop policy if exists "progress seen by members" on public.club_progress;
create policy "progress seen by members" on public.club_progress
  for select to authenticated using (public.is_club_member(public.reading_club(reading_id), auth.uid()));
drop policy if exists "own progress" on public.club_progress;
create policy "own progress" on public.club_progress
  for insert to authenticated with check (user_id = auth.uid() and public.is_club_member(public.reading_club(reading_id), auth.uid()));
drop policy if exists "change own progress" on public.club_progress;
create policy "change own progress" on public.club_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.club_progress from anon, authenticated;
grant select on public.club_progress to authenticated;
grant insert (reading_id, user_id, part, updated_at), update (part, updated_at) on public.club_progress to authenticated;
grant all on public.club_progress to service_role;

-- How far I am in a reading (0 if I haven't said).
create or replace function public.my_reading_part(p_reading uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select part from public.club_progress where reading_id = p_reading and user_id = auth.uid()), 0);
$$;
revoke execute on function public.my_reading_part(uuid) from public, anon;
grant execute on function public.my_reading_part(uuid) to authenticated;

create table if not exists public.club_notes (
  id          uuid primary key default gen_random_uuid(),
  reading_id  uuid not null references public.club_readings (id) on delete cascade,
  author      uuid not null references public.profiles (id) on delete cascade,
  part        int not null check (part between 1 and 200),
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index if not exists club_notes_reading on public.club_notes (reading_id, part, created_at);
alter table public.club_notes enable row level security;

-- The spoiler lock: you see a note once you've reached its chapter (or the club has finished the book).
-- Your own notes, always.
drop policy if exists "notes up to where you are" on public.club_notes;
create policy "notes up to where you are" on public.club_notes
  for select to authenticated using (
    public.is_club_member(public.reading_club(reading_id), auth.uid())
    and not public.is_blocked(author, auth.uid())
    and (author = auth.uid()
         or part <= public.my_reading_part(reading_id)
         or exists (select 1 from public.club_readings r where r.id = reading_id and r.finished_at is not null)));
drop policy if exists "members write notes" on public.club_notes;
create policy "members write notes" on public.club_notes
  for insert to authenticated with check (
    author = auth.uid() and public.is_club_member(public.reading_club(reading_id), auth.uid())
    and part <= (select parts from public.club_readings r where r.id = reading_id));
drop policy if exists "guests can't write notes" on public.club_notes;
create policy "guests can't write notes" on public.club_notes
  as restrictive for insert to authenticated with check (not public.is_guest());
drop policy if exists "remove own notes, hosts any" on public.club_notes;
create policy "remove own notes, hosts any" on public.club_notes
  for delete to authenticated using (author = auth.uid() or public.is_club_host(public.reading_club(reading_id), auth.uid()));

revoke all on public.club_notes from anon, authenticated;
grant select, delete on public.club_notes to authenticated;
grant insert (reading_id, author, part, body) on public.club_notes to authenticated;
grant all on public.club_notes to service_role;

-- No more than 20 notes a minute from one person.
create or replace function public.check_club_note() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_offensive(new.body) then raise exception 'Keep it kind: that has words Bottega doesn''t allow.'; end if;
  if (select count(*) from public.club_notes where author = new.author and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Slow down a little.';
  end if;
  return new;
end $$;
drop trigger if exists club_notes_check on public.club_notes;
create trigger club_notes_check before insert on public.club_notes
  for each row execute function public.check_club_note();

-- The club's current book, where I am, and counts only (never words) for what's still ahead of me.
create or replace function public.club_reading_now(p_club uuid)
returns table (id uuid, title text, subtitle text, cover_url text, link text, parts int, part_word text, due_on date,
               started_at timestamptz, my_part int, readers int, finished int, notes_ahead int)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.subtitle, r.cover_url, r.link, r.parts, r.part_word, r.due_on, r.started_at,
         public.my_reading_part(r.id),
         (select count(*)::int from public.club_progress p where p.reading_id = r.id and p.part > 0),
         (select count(*)::int from public.club_progress p where p.reading_id = r.id and p.part >= r.parts),
         (select count(*)::int from public.club_notes n where n.reading_id = r.id and n.author <> auth.uid()
            and n.part > public.my_reading_part(r.id) and not public.is_blocked(n.author, auth.uid()))
  from public.club_readings r
  where r.club_id = p_club and r.finished_at is null and public.is_club_member(p_club, auth.uid());
$$;
revoke execute on function public.club_reading_now(uuid) from public, anon;
grant execute on function public.club_reading_now(uuid) to authenticated;

-- The host finishes the book: it goes on the club's shelf, and every note opens up for everyone.
create or replace function public.finish_club_reading(p_reading uuid, p_shelve boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.club_readings;
begin
  select * into r from public.club_readings where id = p_reading;
  if r.id is null or not public.is_club_host(r.club_id, auth.uid()) then raise exception 'Only the club''s hosts can do that.'; end if;
  if r.finished_at is not null then return; end if;
  update public.club_readings set finished_at = now() where id = p_reading;
  if p_shelve then
    insert into public.club_shelf (club_id, type, title, subtitle, cover_url, link, added_by)
    values (r.club_id, 'book', left(r.title, 120), left(r.subtitle, 120), r.cover_url, r.link, auth.uid());
  end if;
end $$;
revoke execute on function public.finish_club_reading(uuid, boolean) from public, anon;
grant execute on function public.finish_club_reading(uuid, boolean) to authenticated;
