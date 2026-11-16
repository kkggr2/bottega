-- Bottega: a club's shelf and "What's next?".
-- The shelf: everything the club has watched, read or listened to together, newest first. The host keeps it.
-- What's next: the host puts up two to four choices, members tap one, and the host closes the vote
-- (the winner can go straight onto the shelf). One open vote per club at a time.
-- Run this in the Supabase SQL editor after 20261116000000_clubs.sql. It is safe to run again.

create or replace function public.is_club_host(p_club uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clubs where id = p_club and host = p_user);
$$;
revoke execute on function public.is_club_host(uuid, uuid) from public, anon;
grant execute on function public.is_club_host(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The shelf
-- ---------------------------------------------------------------------------

create table if not exists public.club_shelf (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs (id) on delete cascade,
  type        text not null check (type in ('film', 'book', 'song')),
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  subtitle    text not null default '' check (char_length(subtitle) <= 120),
  cover_url   text check (cover_url is null
                or cover_url ~ '^https://(is[0-9]+-ssl\.mzstatic\.com|covers\.openlibrary\.org|i\.ytimg\.com|image\.tmdb\.org)/'),
  link        text check (link is null or (link ~ '^https://\S+$' and char_length(link) <= 500)),
  note        text not null default '' check (char_length(note) <= 200),
  added_by    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists club_shelf_club on public.club_shelf (club_id, created_at desc);
alter table public.club_shelf enable row level security;

drop policy if exists "shelf seen by members" on public.club_shelf;
create policy "shelf seen by members" on public.club_shelf
  for select to authenticated using (public.is_club_member(club_id, auth.uid()));
drop policy if exists "host adds to the shelf" on public.club_shelf;
create policy "host adds to the shelf" on public.club_shelf
  for insert to authenticated with check (added_by = auth.uid() and public.is_club_host(club_id, auth.uid()));
drop policy if exists "host takes things off the shelf" on public.club_shelf;
create policy "host takes things off the shelf" on public.club_shelf
  for delete to authenticated using (public.is_club_host(club_id, auth.uid()));

revoke all on public.club_shelf from anon, authenticated;
grant select, delete on public.club_shelf to authenticated;
grant insert (club_id, type, title, subtitle, cover_url, link, note, added_by) on public.club_shelf to authenticated;
grant select, insert, update, delete on public.club_shelf to service_role;

-- At most 300 things on a shelf.
create or replace function public.limit_club_shelf() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.club_shelf where club_id = new.club_id) >= 300 then
    raise exception 'The shelf is full: take something off first.';
  end if;
  if public.is_offensive(new.note) then
    raise exception 'Keep it kind: that note has words Bottega doesn''t allow.';
  end if;
  return new;
end $$;
drop trigger if exists club_shelf_limit on public.club_shelf;
create trigger club_shelf_limit before insert on public.club_shelf for each row execute function public.limit_club_shelf();

-- For the invitation page, open to anyone: the newest few covers, so people see what the club is about.
create or replace function public.club_shelf_preview(p_slug text, p_limit int default 8)
returns table (type text, title text, subtitle text, cover_url text)
language sql stable security definer set search_path = public as $$
  select s.type, s.title, s.subtitle, s.cover_url
  from public.club_shelf s join public.clubs c on c.id = s.club_id
  where c.slug = lower(btrim(p_slug))
  order by s.created_at desc
  limit least(greatest(p_limit, 1), 12);
$$;
grant execute on function public.club_shelf_preview(text, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- What's next?
-- ---------------------------------------------------------------------------

create table if not exists public.club_polls (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs (id) on delete cascade,
  question    text not null default 'What''s next?' check (char_length(btrim(question)) between 2 and 80),
  -- Two to four choices: [{ type, title, subtitle, cover_url, link }]
  options     jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 4),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  winner      int
);
create unique index if not exists club_polls_one_open on public.club_polls (club_id) where closed_at is null;
alter table public.club_polls enable row level security;

drop policy if exists "polls seen by members" on public.club_polls;
create policy "polls seen by members" on public.club_polls
  for select to authenticated using (public.is_club_member(club_id, auth.uid()));
revoke all on public.club_polls from anon, authenticated;
grant select on public.club_polls to authenticated;
grant select, insert, update, delete on public.club_polls to service_role;

create table if not exists public.club_votes (
  poll_id     uuid not null references public.club_polls (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  choice      int  not null check (choice between 0 and 3),
  voted_at    timestamptz not null default now(),
  primary key (poll_id, user_id)
);
alter table public.club_votes enable row level security;
revoke all on public.club_votes from anon, authenticated;
grant select, insert, update, delete on public.club_votes to service_role;

-- The host opens a vote (closing any earlier one without a winner).
create or replace function public.open_club_poll(p_club uuid, p_options jsonb, p_question text default 'What''s next?')
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; o jsonb;
begin
  if not public.is_club_host(p_club, auth.uid()) then raise exception 'Only the club''s host can ask.'; end if;
  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 4 then
    raise exception 'Give two to four choices.';
  end if;
  for o in select * from jsonb_array_elements(p_options) loop
    if coalesce(btrim(o->>'title'), '') = '' or char_length(o->>'title') > 120 then raise exception 'Each choice needs a title.'; end if;
    if o->>'type' not in ('film', 'book', 'song') then raise exception 'Choices are films, books or songs.'; end if;
    if o->>'cover_url' is not null and o->>'cover_url' !~ '^https://(is[0-9]+-ssl\.mzstatic\.com|covers\.openlibrary\.org|i\.ytimg\.com|image\.tmdb\.org)/' then
      raise exception 'That cover can''t be used.';
    end if;
  end loop;
  if public.is_offensive(p_question) then raise exception 'Keep it kind: that question has words Bottega doesn''t allow.'; end if;
  update public.club_polls set closed_at = now() where club_id = p_club and closed_at is null;
  insert into public.club_polls (club_id, question, options, created_by)
    values (p_club, coalesce(nullif(btrim(p_question), ''), 'What''s next?'), p_options, auth.uid())
    returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.open_club_poll(uuid, jsonb, text) from public, anon;
grant execute on function public.open_club_poll(uuid, jsonb, text) to authenticated;

-- A member votes (or changes their vote) while the vote is open.
create or replace function public.vote_club_poll(p_poll uuid, p_choice int)
returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from public.club_polls where id = p_poll;
  if p.id is null or p.closed_at is not null then raise exception 'This vote has closed.'; end if;
  if not public.is_club_member(p.club_id, auth.uid()) then raise exception 'Only the club''s members can vote.'; end if;
  if p_choice < 0 or p_choice >= jsonb_array_length(p.options) then raise exception 'Pick one of the choices.'; end if;
  insert into public.club_votes (poll_id, user_id, choice) values (p_poll, auth.uid(), p_choice)
    on conflict (poll_id, user_id) do update set choice = excluded.choice, voted_at = now();
end $$;
revoke execute on function public.vote_club_poll(uuid, int) from public, anon;
grant execute on function public.vote_club_poll(uuid, int) to authenticated;

-- The host closes the vote: the most votes wins (on a tie, the earlier choice). Optionally onto the shelf.
create or replace function public.close_club_poll(p_poll uuid, p_shelve boolean default true)
returns int
language plpgsql security definer set search_path = public as $$
declare p record; w int; o jsonb;
begin
  select * into p from public.club_polls where id = p_poll;
  if p.id is null or p.closed_at is not null then raise exception 'This vote has closed.'; end if;
  if not public.is_club_host(p.club_id, auth.uid()) then raise exception 'Only the club''s host can close it.'; end if;
  select i into w from (
    select i, (select count(*) from public.club_votes v where v.poll_id = p_poll and v.choice = i) as n
    from generate_series(0, jsonb_array_length(p.options) - 1) as i
  ) t order by n desc, i asc limit 1;
  update public.club_polls set closed_at = now(), winner = w where id = p_poll;
  if p_shelve then
    o := p.options -> w;
    insert into public.club_shelf (club_id, type, title, subtitle, cover_url, link, added_by)
      values (p.club_id, o->>'type', o->>'title', coalesce(o->>'subtitle', ''), o->>'cover_url', o->>'link', auth.uid());
  end if;
  return w;
end $$;
revoke execute on function public.close_club_poll(uuid, boolean) from public, anon;
grant execute on function public.close_club_poll(uuid, boolean) to authenticated;

-- The club's vote for the club page: the open one (or the last closed one), counts per choice, and my vote.
create or replace function public.club_poll_state(p_club uuid)
returns table (id uuid, question text, options jsonb, closed_at timestamptz, winner int, counts int[], my_choice int, voters int)
language sql stable security definer set search_path = public as $$
  select p.id, p.question, p.options, p.closed_at, p.winner,
         array(select (select count(*)::int from public.club_votes v where v.poll_id = p.id and v.choice = i)
               from generate_series(0, jsonb_array_length(p.options) - 1) as i order by i),
         (select v.choice from public.club_votes v where v.poll_id = p.id and v.user_id = auth.uid()),
         (select count(*)::int from public.club_votes v where v.poll_id = p.id)
  from public.club_polls p
  where p.club_id = p_club and public.is_club_member(p_club, auth.uid())
  order by (p.closed_at is null) desc, p.created_at desc
  limit 1;
$$;
revoke execute on function public.club_poll_state(uuid) from public, anon;
grant execute on function public.club_poll_state(uuid) to authenticated;
