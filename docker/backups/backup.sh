#!/usr/bin/env bash
# Creates a compressed, timestamped pg_dump and prunes old backups.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/studio_os-${STAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"
echo "[backup] dumping ${POSTGRES_DB} -> ${OUT}"

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h studio-os-db \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --no-owner --no-privileges \
  | gzip -9 > "${OUT}"

echo "[backup] pruning backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name 'studio_os-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] done: $(du -h "${OUT}" | cut -f1)"
