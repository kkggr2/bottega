#!/bin/bash
# Step 3 of the Frankfurt move: count what's in the old and the new database, side by side.
# Every line should show the same number twice.
set -euo pipefail
docker info >/dev/null 2>&1 || { echo "Open Docker Desktop first."; exit 1; }
read -rsp "Singapore (old) connection string: " OLD; echo
read -rsp "Frankfurt (new) connection string: " NEW; echo
SQL="select 'accounts', count(*) from auth.users
union all select 'people', count(*) from public.profiles
union all select 'rooms', count(*) from public.rooms
union all select 'pieces', count(*) from public.pieces
union all select 'friendships', count(*) from public.friendships
union all select 'clubs', count(*) from public.clubs
union all select 'club members', count(*) from public.club_members
union all select 'quiz tries', count(*) from public.quiz_attempts
union all select 'notes', count(*) from public.notes
union all select 'recommendations', count(*) from public.recommendations
union all select 'rooms for two', count(*) from public.together_rooms
union all select 'push tokens', count(*) from public.push_tokens
union all select 'uploaded files', count(*) from storage.objects where bucket_id = 'media'
union all select 'live tables', count(*) from pg_publication_tables where pubname = 'supabase_realtime'
union all select 'logins (sessions)', count(*) from auth.refresh_tokens;"
count() { docker run --rm postgres:17 psql "$1" -At -F '|' -c "$SQL"; }
paste -d '|' <(count "$OLD") <(count "$NEW" | cut -d'|' -f2) | while IFS='|' read -r what old new; do
  mark="✓"; [[ "$old" == "$new" ]] || mark="✗ DIFFERENT"
  printf "%-20s %8s %8s  %s\n" "$what" "$old" "$new" "$mark"
done
