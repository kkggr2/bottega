-- The tables the app watches live (chat, notes, rooms changing while you're inside).
-- Only needed if 3-compare.sh shows "live tables" lower in Frankfurt. Safe to run again.
do $$
declare t text;
begin
  foreach t in array array['pieces', 'rooms', 'friendships', 'notes', 'recommendations', 'chat_messages', 'direct_messages'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
