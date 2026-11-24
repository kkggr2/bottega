-- What an organised club needs to leave WhatsApp (asked for by the Left Book Club):
--   1. A note from the host, pinned at the top of the club (and any chat message can be pinned there).
--   2. Club chat keeps three months of history instead of a week.
--   3. Meetings can carry discussion questions and a reading guide link.
--   4. Members without notifications get club news by email: the meeting reminder the day before,
--      and a short weekly letter (only when something is happening). One click stops it.
-- Run this in the Supabase SQL editor after 20261206000000_now_watching.sql. It is safe to run again.

-- ---------------------------------------------------------------------------
-- 1. The host's pinned note
-- ---------------------------------------------------------------------------

alter table public.clubs add column if not exists pinned_note text check (pinned_note is null or char_length(pinned_note) between 1 and 600);
alter table public.clubs add column if not exists pinned_at timestamptz;
alter table public.clubs add column if not exists pinned_by uuid references public.profiles (id) on delete set null;

create or replace function public.club_pinned(p_club uuid)
returns table (note text, pinned_at timestamptz, by_username text)
language sql stable security definer set search_path = public as $$
  select c.pinned_note, c.pinned_at, p.username::text
  from public.clubs c left join public.profiles p on p.id = c.pinned_by
  where c.id = p_club and c.pinned_note is not null and public.is_club_member(p_club, auth.uid());
$$;
revoke execute on function public.club_pinned(uuid) from public, anon;
grant execute on function public.club_pinned(uuid) to authenticated;

-- Hosts and co-hosts only. An empty note takes it down.
create or replace function public.set_club_pin(p_club uuid, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
declare v text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_club_host(p_club, auth.uid()) then raise exception 'Only the club''s hosts can do that.'; end if;
  if v is not null and char_length(v) > 600 then raise exception 'Keep the note under 600 characters.'; end if;
  update public.clubs
     set pinned_note = v,
         pinned_at = case when v is null then null else now() end,
         pinned_by = case when v is null then null else auth.uid() end
   where id = p_club;
end $$;
revoke execute on function public.set_club_pin(uuid, text) from public, anon;
grant execute on function public.set_club_pin(uuid, text) to authenticated;

-- A pinned note can tell the club (one push, like a new meeting).
alter table public.club_push_log drop constraint if exists club_push_log_kind_check;
alter table public.club_push_log add constraint club_push_log_kind_check check (kind in ('message', 'poll', 'meeting', 'reading', 'pin'));

-- ---------------------------------------------------------------------------
-- 2. Club chat keeps three months (other chat rooms still last a day)
-- ---------------------------------------------------------------------------

drop policy if exists "chat readable by people in the room" on public.chat_messages;
create policy "chat readable by people in the room" on public.chat_messages
  for select to authenticated
  using (created_at > now() - case when room_key like 'club:%' then interval '90 days' else interval '24 hours' end
         and room_key in (select public.my_chat_keys())
         and not public.is_blocked(author, auth.uid()));

create or replace function public.purge_chat() returns int
language sql security definer set search_path = public as $$
  with gone as (
    delete from public.chat_messages
    where created_at < now() - case when room_key like 'club:%' then interval '91 days' else interval '48 hours' end
    returning 1)
  select count(*)::int from gone;
$$;

-- ---------------------------------------------------------------------------
-- 3. Discussion questions and a reading guide on meetings
-- ---------------------------------------------------------------------------

alter table public.club_meetings add column if not exists questions text not null default '' check (char_length(questions) <= 2000);
alter table public.club_meetings add column if not exists guide_url text
  check (guide_url is null or (guide_url ~ '^https://\S+$' and char_length(guide_url) <= 500));

grant insert (club_id, starts_at, place, link, note, tz, created_by, questions, guide_url) on public.club_meetings to authenticated;
grant update (starts_at, place, link, note, tz, questions, guide_url) on public.club_meetings to authenticated;

drop function if exists public.club_next_meeting(uuid);
create function public.club_next_meeting(p_club uuid)
returns table (id uuid, starts_at timestamptz, place text, link text, note text, questions text, guide_url text,
               going text[], maybe int, not_going int, my_answer text)
language sql stable security definer set search_path = public as $$
  select mt.id, mt.starts_at, mt.place, mt.link, mt.note, mt.questions, mt.guide_url,
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

-- ---------------------------------------------------------------------------
-- 4. Club news by email, for members without notifications
-- ---------------------------------------------------------------------------

alter table public.email_prefs add column if not exists club_letter boolean not null default true;
alter table public.email_prefs add column if not exists last_club_letter_at timestamptz;
grant insert (user_id, digest, club_letter), update (user_id, digest, club_letter) on public.email_prefs to authenticated;

-- Of these people, the ones to email instead: an address, club emails on, and no phone or browser to buzz.
create or replace function public.club_email_targets(p_users uuid[])
returns table (user_id uuid, email text)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text
  from auth.users u
  left join public.email_prefs ep on ep.user_id = u.id
  where u.id = any(p_users) and u.email is not null and coalesce(ep.club_letter, true)
    and not exists (select 1 from public.push_tokens t where t.user_id = u.id);
$$;

-- The weekly letter: for each member without notifications, what's happening in each club they haven't muted.
-- A club is listed only if something is: a meeting in the next two weeks, a book or film under way,
-- a host's note from the last two weeks, or messages from others this week. Nobody gets an empty letter.
create or replace function public.club_letter_batch()
returns table (user_id uuid, email text, username text, clubs jsonb)
language sql stable security definer set search_path = public, auth as $$
  with people as (
    select u.id, u.email::text as email, pr.username::text as username
    from auth.users u
    join public.profiles pr on pr.id = u.id
    left join public.email_prefs ep on ep.user_id = u.id
    where u.email is not null and coalesce(ep.club_letter, true)
      and (ep.last_club_letter_at is null or ep.last_club_letter_at < now() - interval '6 days')
      and not exists (select 1 from public.push_tokens t where t.user_id = u.id)
  ),
  per_club as (
    select p.id as user_id, c.id as club_id, c.name, c.slug,
      (select jsonb_build_object('starts_at', mt.starts_at, 'tz', mt.tz, 'place', mt.place,
                                 'answer', (select r.answer from public.club_rsvps r where r.meeting_id = mt.id and r.user_id = p.id))
         from public.club_meetings mt
        where mt.club_id = c.id and mt.starts_at between now() and now() + interval '14 days'
        order by mt.starts_at limit 1) as meeting,
      (select jsonb_build_object('title', r.title, 'kind', r.kind, 'parts', r.parts, 'part_word', r.part_word,
                                 'my_part', coalesce((select g.part from public.club_progress g where g.reading_id = r.id and g.user_id = p.id), 0))
         from public.club_readings r where r.club_id = c.id and r.finished_at is null limit 1) as reading,
      case when c.pinned_at > now() - interval '14 days' then c.pinned_note end as pin,
      (select count(*)::int from public.chat_messages cm
        where cm.room_key = 'club:' || c.slug and cm.author <> p.id and cm.created_at > now() - interval '7 days'
          and not public.is_blocked(cm.author, p.id)) as chat
    from people p
    join public.club_members m on m.user_id = p.id and not m.muted
    join public.clubs c on c.id = m.club_id
  )
  select p.id, p.email, p.username,
         jsonb_agg(jsonb_build_object('name', x.name, 'slug', x.slug, 'meeting', x.meeting, 'reading', x.reading,
                                      'pin', x.pin, 'chat', x.chat) order by x.name)
  from people p
  join per_club x on x.user_id = p.id
  where x.meeting is not null or x.reading is not null or x.pin is not null or x.chat > 0
  group by p.id, p.email, p.username;
$$;

create or replace function public.mark_club_letter_sent(p_users uuid[])
returns void
language sql security definer set search_path = public as $$
  insert into public.email_prefs (user_id, last_club_letter_at)
  select unnest(p_users), now()
  on conflict (user_id) do update set last_club_letter_at = excluded.last_club_letter_at;
$$;

create or replace function public.stop_club_letter(p_user uuid)
returns void
language sql security definer set search_path = public as $$
  insert into public.email_prefs (user_id, club_letter) values (p_user, false)
  on conflict (user_id) do update set club_letter = false;
$$;

revoke execute on function public.club_email_targets(uuid[]), public.club_letter_batch(),
  public.mark_club_letter_sent(uuid[]), public.stop_club_letter(uuid) from public, anon, authenticated;
grant execute on function public.club_email_targets(uuid[]), public.club_letter_batch(),
  public.mark_club_letter_sent(uuid[]), public.stop_club_letter(uuid) to service_role;
