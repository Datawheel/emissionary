#!/bin/sh
set -e

echo "Running database migrations…"
npx tsx db/migrate.ts

# Items/country factors are upserted (and their version bumped) on every run, so
# this is opt-in: set SYNC_ITEMS=1 on the first deploy and after data changes.
if [ "${SYNC_ITEMS:-0}" = "1" ]; then
  echo "Syncing items and country factors…"
  npx tsx scripts/sync-items.ts
fi

echo "Starting Next.js on port ${PORT:-3000}…"
exec node node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
