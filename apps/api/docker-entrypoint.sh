#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] waiting for database..."
ATTEMPTS=0
until pnpm --filter @studio-os/api exec prisma db push --skip-generate --accept-data-loss >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 30 ]; then
    echo "[entrypoint] database not reachable after 30 attempts" >&2
    # Try once more with visible output to surface the error.
    pnpm --filter @studio-os/api exec prisma db push --skip-generate --accept-data-loss
    exit 1
  fi
  echo "[entrypoint] db not ready (attempt ${ATTEMPTS}); retrying in 3s"
  sleep 3
done
echo "[entrypoint] schema synced"

echo "[entrypoint] applying pgvector dimension + hybrid-search indexes"
pnpm --filter @studio-os/api exec tsx scripts/post-migrate.ts

echo "[entrypoint] seeding bootstrap data (idempotent)"
pnpm --filter @studio-os/api exec tsx prisma/seed.ts

echo "[entrypoint] starting API"
exec pnpm --filter @studio-os/api start
