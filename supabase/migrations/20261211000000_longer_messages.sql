-- Room to say something properly: club chat and private messages can hold a few paragraphs (up to 2,000
-- characters, line breaks kept). Before this, club chat stopped at 500 and private messages at 1,000, on one line;
-- book groups write longer than that.
-- Run this in the Supabase SQL editor. It is safe to run again.

-- Drop the old length rule on each table, whatever it was named.
do $$
declare c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where conrelid in ('public.chat_messages'::regclass, 'public.direct_messages'::regclass)
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%char_length%body%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table public.chat_messages
  add constraint chat_messages_body_check check (char_length(btrim(body)) between 1 and 2000);
alter table public.direct_messages
  add constraint direct_messages_body_check check (char_length(btrim(body)) between 1 and 2000);
