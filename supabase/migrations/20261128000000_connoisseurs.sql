-- Founding Connoisseurs: the first 50 people Bottega invites for their taste. They get a numbered badge on their
-- room and a place on the Connoisseurs wall (Library, welcome page, bottegarooms.com/connoisseurs).
-- Only Bottega adds them, here in the SQL editor. A Connoisseur's room is only on the wall while it is public.
-- Run this in the Supabase SQL editor. It is safe to run again.
--
-- Add someone (next free number, optional one line about them):
--   insert into public.connoisseurs (owner_id, number, note)
--   select id, 2, 'Reads Russian novels in the bath' from public.profiles where username = '…';
-- Change their line:   update public.connoisseurs set note = '…' where number = 2;
-- Remove someone:      delete from public.connoisseurs where number = 2;

create table if not exists public.connoisseurs (
  owner_id  uuid primary key references public.profiles (id) on delete cascade,
  number    int  not null unique check (number between 1 and 50),
  note      text not null default '' check (char_length(note) <= 140),
  added_at  timestamptz not null default now()
);
alter table public.connoisseurs enable row level security;
revoke all on public.connoisseurs from anon, authenticated;
grant all on public.connoisseurs to service_role;

-- The wall: public rooms only, in number order, with three covers each.
create or replace function public.connoisseurs()
returns table (username text, room_name text, theme text, number int, note text, covers text[])
language sql stable security definer set search_path = public as $$
  select p.username::text, r.name, r.theme, c.number, c.note,
         array(select x.cover_url from public.pieces x
               where x.owner_id = c.owner_id and x.cover_url is not null
               order by x.position limit 3)
  from public.connoisseurs c
  join public.rooms r on r.owner_id = c.owner_id and r.visibility = 'public'
  join public.profiles p on p.id = c.owner_id
  order by c.number;
$$;
grant execute on function public.connoisseurs() to anon, authenticated;

-- The number on someone's badge, or null.
create or replace function public.connoisseur_number(p_username text)
returns int
language sql stable security definer set search_path = public as $$
  select c.number from public.connoisseurs c
  join public.profiles p on p.id = c.owner_id
  where p.username = lower(btrim(p_username));
$$;
grant execute on function public.connoisseur_number(text) to anon, authenticated;

-- No. 1
insert into public.connoisseurs (owner_id, number)
select id, 1 from public.profiles where username = 'zesframes'
on conflict (owner_id) do nothing;
