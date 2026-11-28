-- A wall looks best with room to breathe: it holds at most 12 posters and poems. Films beyond that go in the DVD pile.
-- Walls that already hold more keep everything; they just can't hang anything new until there's space.
-- The app says the same (WALL_MAX in src/lib/themes.ts) and keeps people from running into this.
-- Run this in the Supabase SQL editor after 20261212000000_club_covers.sql. It is safe to run again.

create or replace function public.enforce_wall_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.type in ('poster', 'poem')
     and (tg_op = 'INSERT' or old.type not in ('poster', 'poem'))
     and (select count(*) from public.pieces
          where owner_id = new.owner_id and type in ('poster', 'poem') and id <> new.id) >= 12 then
    raise exception 'The wall holds 12. Move one to the DVD pile, or take one down, to hang something new.';
  end if;
  return new;
end $$;

drop trigger if exists pieces_wall_limit on public.pieces;
create trigger pieces_wall_limit before insert or update of type on public.pieces
  for each row execute function public.enforce_wall_limit();
