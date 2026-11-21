#!/bin/bash
# Step 1 of the Frankfurt move (docs/FRANKFURT_MOVE.md): copy the whole database, accounts included,
# from the Singapore project into the new Frankfurt one. Supabase's own documented method (db dump + psql).
# The copies go to ~/bottega-move (outside the project, never committed). Needs Docker Desktop running.
set -euo pipefail
cd "$(dirname "$0")/../.."
WORK="$HOME/bottega-move"
mkdir -p "$WORK" && chmod 700 "$WORK"
cp scripts/move/storage-rules.sql "$WORK/"

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Open Docker Desktop, wait until it says it's running, then run this again."
  exit 1
fi

echo "Paste each connection string (Connect → Session pooler → URI, with your password filled in)."
echo "Nothing is shown while you paste; press Enter after each."
read -rsp "Singapore (old) connection string: " OLD; echo
read -rsp "Frankfurt (new) connection string: " NEW; echo
[[ "$OLD" == postgresql://* && "$NEW" == postgresql://* ]] || { echo "Those don't look like connection strings (they start with postgresql://)."; exit 1; }
[[ "$OLD" != "$NEW" ]] || { echo "Old and new are the same. Check you copied the Frankfurt one second."; exit 1; }

SB="npx --yes supabase@3"
echo "1/4  Copying the database roles…"
$SB db dump --db-url "$OLD" -f "$WORK/roles.sql" --role-only
echo "2/4  Copying the structure (tables, rules, functions)…"
$SB db dump --db-url "$OLD" -f "$WORK/schema.sql"
echo "3/4  Copying the data (accounts, rooms, pieces, clubs, quizzes…)…"
$SB db dump --db-url "$OLD" -f "$WORK/data.sql" --use-copy --data-only

echo "4/4  Loading it all into Frankfurt (one go: if anything fails, nothing is half-copied)…"
docker run --rm -v "$WORK":/work postgres:17 psql "$NEW" \
  --single-transaction --variable ON_ERROR_STOP=1 \
  --file /work/roles.sql \
  --file /work/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file /work/data.sql
docker run --rm -v "$WORK":/work postgres:17 psql "$NEW" --variable ON_ERROR_STOP=1 --quiet --file /work/storage-rules.sql

echo
echo "Done: the database is copied to Frankfurt. Next: node scripts/move/2-copy-files.mjs"
